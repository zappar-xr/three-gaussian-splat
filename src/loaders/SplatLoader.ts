import * as THREE from 'three';

export class SplatLoader extends THREE.Loader {
  constructor(private processDataCallback?: (data: Uint8Array, bytesRead: number, isComplete?: boolean) => void, manager?: THREE.LoadingManager) {
    super(manager);
  }

  public load(url: string, onLoad?: (data: Uint8Array) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void {
    fetch(this._getAbsoluteURL(url), {
      mode: 'cors',
      credentials: this.withCredentials ? 'include' : 'omit',
    })
      .then(req => {
        if (req.status !== 200) {
          if (onError) {
            onError(this._getErrorEventForNon200Response(req));
          }
          this.manager.itemError(url);
          return;
        }
        return req.arrayBuffer();
      })
      .then(buffer => {
        if (!buffer) {
          return;
        }

        const data = new Uint8Array(buffer, 0, this._getRowQuantisedByteLength(buffer.byteLength));
        this._processData(data, data.length, true);

        if (onLoad) {
          onLoad(data);
        }

        this.manager.itemEnd(url);
      })
      .catch(error => {
        if (onError) {
          onError(this._getErrorEventForFetchError(error));
        }
        this.manager.itemError(url);
      });

    this.manager.itemStart(url);
  }

  public loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<{data: Uint8Array; bytesRead: number}> {
    return new Promise((resolve, reject) => {
      this.load(
        url,
        data => {
          resolve({data, bytesRead: data.length});
        },
        onProgress,
        reject
      );
    });
  }

  public stream(url: string, onLoad?: (data: Uint8Array) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): Promise<{data: Uint8Array; bytesRead: number}> {
    return new Promise(resolve => {
      fetch(this._getAbsoluteURL(url), {
        mode: 'cors',
        credentials: this.withCredentials ? 'include' : 'omit',
      })
        .then(req => {
          if (req.status !== 200) {
            if (onError) {
              onError(this._getErrorEventForNon200Response(req));
            }
            this.manager.itemError(url);
            return;
          }

          const {headers, body} = req;

          const contentLength = Number(headers.get('Content-Length'));
          if (!Number.isFinite(contentLength)) {
            if (onError) {
              onError(new ErrorEvent('NetworkError', {message: 'Cannot stream response without `Content-Length` header'}));
            }
            this.manager.itemError(url);
            return;
          }

          if (!body) {
            if (onError) {
              onError(new ErrorEvent('NetworkError', {message: 'Empty response body'}));
            }
            this.manager.itemError(url);
            return;
          }

          const reader = body.getReader();
          const buffer = new SharedArrayBuffer(contentLength);
          const out = {
            data: new Uint8Array(buffer),
            bytesRead: 0,
          };

          const _onProgress = (loaded: number, total: number) => {
            if (onProgress) {
              onProgress(new ProgressEvent('progress', {loaded, total}));
            }
          };

          resolve(out);
          _onProgress(0, contentLength);

          let incompleteRowLength = 0;
          const incompleteRow = new Uint8Array(ROW_LENGTH);

          const processStream = ({done, value: currBytes}: ReadableStreamReadResult<Uint8Array>) => {
            if (done) {
              if (incompleteRowLength > 0) {
                // TODO: warn the user about trailing/incomplete data
              }
              if (onLoad) {
                onLoad(out.data);
              }
              this.manager.itemEnd(url);
              return;
            }

            if (incompleteRowLength > 0) {
              // write the previous incomplete row to the buffer
              for (let i = 0; i < incompleteRowLength; i++) {
                out.data[out.bytesRead + i] = incompleteRow[i];
              }
              out.bytesRead += incompleteRowLength;
              incompleteRowLength = 0;
              // save a write here by always zeroing out the rest of the row during write
            }

            // get the length of the complete rows
            const currCompleteRowsByteLength = this._getRowQuantisedByteLength(out.bytesRead + currBytes.length) - out.bytesRead;
            const currRemainingByteLength = currBytes.length - currCompleteRowsByteLength;

            if (currRemainingByteLength > 0) {
              // store the next incomplete row to be written to the next time processStream is called
              for (let i = 0; i < currRemainingByteLength; i++) {
                incompleteRow[i] = currBytes[currCompleteRowsByteLength + i];
              }
              incompleteRow.fill(0, currRemainingByteLength);
              incompleteRowLength = currRemainingByteLength;
            }

            // get view of only the complete rows
            const currRowBytes = currBytes.subarray(0, currCompleteRowsByteLength);

            // write the complete rows to the buffer
            out.data.set(currRowBytes, out.bytesRead);
            out.bytesRead += currCompleteRowsByteLength;

            this._processData(out.data, out.bytesRead);
            _onProgress(out.bytesRead, contentLength);

            reader.read().then(processStream);
          };
          reader.read().then(processStream);
        })
        .catch(error => {
          if (onError) {
            onError(this._getErrorEventForFetchError(error));
          }
          this.manager.itemError(url);
        });

      this.manager.itemStart(url);
    });
  }

  private _processData(data: Uint8Array, bytesRead: number, isComplete = false): void {
    this.processDataCallback?.(data, bytesRead, isComplete);
  }

  private _getAbsoluteURL(url: string): string {
    return this.path + url;
  }

  private _getErrorEventForNon200Response(req: Response): ErrorEvent {
    return new ErrorEvent('NetworkError', {message: `${req.status} Unable to load ${req.url}`});
  }

  private _getErrorEventForFetchError(error: Error): ErrorEvent {
    return new ErrorEvent('NetworkError', {message: error.message});
  }

  private _getRowQuantisedByteLength(rowLength: number): number {
    return rowLength - (rowLength % ROW_LENGTH);
  }
}

// TODO: find a way to share this constant with GaussianSplatGeometry
const ROW_LENGTH = 3 * 4 + 3 * 4 + 4 + 4;
