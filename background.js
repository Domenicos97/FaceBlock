chrome.runtime.onInstalled.addListener(() => {
  
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set',
              value: '*'
            }
          ]
        },
        condition: {
          urlFilter: "https://*/*",
          resourceTypes: ['image']
        }
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set',
              value: '*'
            }
          ]
        },
        condition: {
          urlFilter: "http://*/*",
          resourceTypes: ['image']
        }
      },
    ],
    removeRuleIds: [1,2]
  });


  chrome.contextMenus.create({
    id: 'Create folder',
    title: "Create folder with this image",
    contexts: ['image']
  });


  chrome.contextMenus.create({
    id: 'Take image',
    title: "Import image in",
    contexts: ['image']
  });


  chrome.storage.local.get().then((all) => {
    for(const [key,val] of Object.entries(all)){
      if(key.startsWith('folder')){
        chrome.contextMenus.create({
          id: key,
          title: val[1],
          parentId: 'Take image',
          contexts: ['image'],
        });
      }
    }
  }).then(() => {return true;})

});


chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(info.menuItemId.startsWith('folder')){
    chrome.tabs.sendMessage(tab.id, {type: 'saveImageFromContext', content: [info.menuItemId, info.srcUrl]});
  }
  else if(info.menuItemId === "Create folder"){
    chrome.tabs.sendMessage(tab.id, {type: 'createFolderFromContext', content: [info.srcUrl]});
  }
  return true;
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type === 'addedImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " added successfully",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'existingImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " is already present in this folder",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'noDetection'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "No face existing in image " + message.content,
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'moreDetections'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " contains more than one face",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'addedFolder'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Folder added successfully",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'addedFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for(const [key,val] of Object.entries(all)){
        if(key === message.content){
          chrome.contextMenus.create({
            id: key,
            title: val[1],
            parentId: 'Take image',
            contexts: ['image'],
          });
        }
      }
    }).then(sendResponse(true));
  }
  else if(message.type === 'updateFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for(const [key,val] of Object.entries(all)){
        if(key === message.content){
          if(val[1] === ""){
            chrome.contextMenus.update(
              key, {title: "Untitled Folder"},
            );
          }
          else{
            chrome.contextMenus.update(
              key, {title: val[1]},
            );
          }
        }
      }
    }).then(sendResponse(true));
  }
  else if(message.type === 'removedFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for (const key of Object.keys(all)){
        if(key === message.content){
          chrome.contextMenus.remove(key);
        }
      }
    }).then(sendResponse(true));
  }
});



/* chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    const queryParameters = tab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);
    
    chrome.tabs.sendMessage(tabId, {
      type: "NEW"
      videoId: urlParameters.get("v")
    });
  }
}); */


/* chrome.tabs.onActivated.addListener(function(activeInfo) {
  // how to fetch tab url using activeInfo.tabid
  chrome.tabs.get(activeInfo.tabId, function(tab){
      console.log("Change: "+tab.url);
  });
}); */