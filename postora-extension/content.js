window.POSTORA_EXTENSION_INSTALLED = true;

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'POSTORA_GET_COOKIES') return;
  try {
    chrome.runtime.sendMessage({ type: 'POSTORA_GET_COOKIES' }, (response) => {
      window.postMessage(
        {
          type: 'POSTORA_COOKIES_RESULT',
          ...(response || { success: false, error: 'extension_error' }),
        },
        '*'
      );
    });
  } catch (e) {
    window.postMessage(
      { type: 'POSTORA_COOKIES_RESULT', success: false, error: 'extension_error' },
      '*'
    );
  }
});
