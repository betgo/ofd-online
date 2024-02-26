export default function loadScript(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script') as HTMLScriptElement & {
        readState: string;
        onreadystatechange: null | (() => void);
      };
      script.type = 'text/javascript';
      if (script.readState) {
        script.onreadystatechange = () => {
          if (
            script.readState === 'loaded' ||
            script.readState === 'complete'
          ) {
            script.onreadystatechange = null;
            resolve(true);
          }
        };
        return;
      }
      script.onload = () => {
        resolve(true);
      };
      script.setAttribute('src', url);
      document.head.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });
}
