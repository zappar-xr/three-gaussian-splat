import * as THREE from 'three';

export class SplatLoader extends THREE.Loader {
  constructor(private processDataCallback?: (data: Uint8Array, bytesRead: number, isComplete?: boolean) => void, manager?: THREE.LoadingManager) {
    super(manager);
  }

  public load(url: string, onLoad?: (data: Uint8Array) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void {
    const path = this.path === '' ? url : this.path + url;

    fetch(path, {
      mode: 'cors',
      credentials: this.withCredentials ? 'include' : 'omit',
    })
      .then(req => {
        if (req.status !== 200) {
          if (onError) {
            onError(new ErrorEvent('NetworkError', {message: `${req.status} Unable to load ${req.url}`}));
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

        const data = new Uint8Array(buffer);
        this._processData(data, data.length, true);

        if (onLoad) {
          onLoad(data);
        }

        this.manager.itemEnd(url);
      })
      .catch(error => {
        if (onError) {
          onError(new ErrorEvent('NetworkError', {message: error.message}));
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

  private _processData(data: Uint8Array, bytesRead: number, isComplete = false): void {
    this.processDataCallback?.(data, bytesRead, isComplete);
  }
}
