chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'POSTORA_GET_COOKIES') {
    return;
  }

  Promise.all([
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'li_at' }),
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' }),
  ])
    .then(([li_at, jsessionid]) => {
      if (!li_at || !li_at.value) {
        sendResponse({ success: false, error: 'not_logged_in' });
        return;
      }
      const jsessionidValue = jsessionid?.value ? jsessionid.value.replace(/"/g, '') : null;
      sendResponse({
        success: true,
        li_at: li_at.value,
        jsessionid: jsessionidValue,
      });
    })
    .catch(() => {
      sendResponse({ success: false, error: 'extension_error' });
    });

  return true;
});
