let loaded = false;
let imageIcon;
let useCircle;
let color;

async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
    faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
    faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
    faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'))
  ]);
  loaded = true;
}


function startOverlay(){
  const div1 = document.createElement('div');
  div1.id = "divLoadingFaceblocker";
  div1.className = 'text-center';
  div1.style.width = window.innerWidth + "px";
  div1.style.height = window.innerHeight + "px";
  div1.style.position = 'fixed';
  div1.style.right = '0px';
  div1.style.bottom = '0px';
  div1.style.display = 'flex';
  div1.style.alignItems = 'center';
  div1.style.justifyContent = 'center';
  div1.style.zIndex = 9999;
  div1.style.background = 'rgba(255,255,255,0.8)';

  const div2 = document.createElement('div');
  div2.className = 'custom-spinner';
  const customCSS = `
  .custom-spinner {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }`;

  const styleElement = document.createElement('style');
  styleElement.innerHTML = customCSS;
  document.head.appendChild(styleElement);

  const span = document.createElement('span');
  span.className = 'visually-hidden';

  div2.appendChild(span);
  div1.appendChild(div2);

  document.body.appendChild(div1);
}


function stopOverlay(mode){
  const div = document.getElementById("divLoadingFaceblocker");
  div.childNodes[0].childNodes[0].remove;
  div.childNodes[0].removeAttribute('class')
  div.childNodes[0].removeAttribute('role')
  const checkImage = new Image();
  checkImage.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  })
  checkImage.style.width = "60px";
  checkImage.style.height = "60px";
  checkImage.style.zIndex = 9999;
  if(mode === "Ok"){
    checkImage.src = chrome.runtime.getURL('check.png');
  }
  else if(mode === "No"){
    checkImage.src = chrome.runtime.getURL('cross.png');
  }
  div.childNodes[0].appendChild(checkImage);
  setTimeout(() => {
    div.remove();
  }, 3000);
}


async function isInStorage(keyToAdd){
  try{
    all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key === keyToAdd){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }
}


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if(loaded){
    if(message.type === 'saveImageFromContext'){
      startOverlay();
      divId = message.content[0];
      result = message.content[1];
      filename = "captured";
      let canvases = [];
      let noDetection = false;

      const imageLoadPromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.crossOrigin = 'anonymous'; 
        img.src = result;
      });
      try {
        await imageLoadPromise.then(async (img) => {
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
          if(detections.length > 0){
            for (const detection of detections){
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d', {willReadFrequently: true});
              canvas.width = img.width;
              canvas.height = img.height;
              context.drawImage(img,
                detection.detection.box.x,
                detection.detection.box.y,
                detection.detection.box.width,
                detection.detection.box.height,
                0, 0, img.width, img.height
              );
              let face = canvas.toDataURL('image/jpeg');
              canvases.push(face);
              isInStorage('imageOfFolder'+divId+face).then(async(result) => {
                if(!result){
                  await chrome.storage.local.set({['imageOfFolder'+divId+face]: [JSON.stringify(detection.descriptor)]});
                }   
              });
              canvas.remove();
            }
          }
          else{
            noDetection = true;
          }
        }).then(() => {
          if(canvases.length !== 0 && !noDetection){
            chrome.runtime.sendMessage({type: 'addedImage', content: filename}, (response) => {
              if(response){
                stopOverlay("Ok");
              }
            });
          }
          else if(noDetection){
            chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
              if(response){
                stopOverlay("No");
              }
            });
          }
        })
      } catch (error) {
        console.error(error);
      }  

      return canvases;
    }
    else if(message.type === 'createFolderFromContext'){
      startOverlay();
      let face;

      let divId;
      let noDetection = false;
      let moreDetections = false;

      let filename = "captured";

      const imageLoadPromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.crossOrigin = 'anonymous';
        img.src = message.content[0];
      });
      try {
        await imageLoadPromise.then(async (img) => {
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
          if(detections.length === 1){
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', {willReadFrequently: true});
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img,
              detections[0].detection.box.x,
              detections[0].detection.box.y,
              detections[0].detection.box.width,
              detections[0].detection.box.height,
              0, 0, img.width, img.height
            );
            face = canvas.toDataURL('image/jpeg');
            divId = crypto.randomUUID();
            const inputValue = "Untitled folder";
            const bTextContent = "On";
            const bClassName = "btn btn-success";
            await chrome.storage.local.set({["folder"+divId]: [face, inputValue, bTextContent, bClassName]})
            await chrome.storage.local.set({['imageOfFolderfolder'+divId+face]: [JSON.stringify(detections[0].descriptor)]});
            canvas.remove();
          }
          else if(detections.length === 0){
            noDetection = true;
          }
          else if(detections.length > 1){
            moreDetections = true;
          }
        }).then(() => {
          if(noDetection){
            chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
              if(response){
                stopOverlay("No");
              }
            });
          }
          else if(moreDetections){
            chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
              if(response){
                stopOverlay("No");
              }
            });
          }
          else{
            chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
              if(response === true){
                stopOverlay("Ok");
                console.log("Cartella aggiunta");
                chrome.runtime.sendMessage({type: 'addedFolder'}, (response) => {
                  if(response === true){
                    console.log("Ok");
                  }
                  else{
                    console.log("No");
                  }
                });
              }
              else{
                console.log("Errore nell'aggiunta della cartella");
              }
            });
          }
        })
      } catch (error) {
        console.error(error);
      }  
      return face;
    }
  }
});


function drawMask(detection, image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d',  { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  const { x, y, width, height } = detection.detection._box;

  if (useCircle) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + (width/2), y + (height/3), height/1.5, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.drawImage(imageIcon, x - (width/4), y - (height/2), width + (width/2), height + (height/2));
  }

  return canvas;
}


function setImageSource(image, src) {
  image.addEventListener('contextmenu', function(event){
    event.preventDefault();
  })

  image.src = src;
  image.srcset = src;
  image.parentNode.insertBefore(image, image.parentNode.firstChild);
  image.removeAttribute('data-original');
}


async function startBlocking(savedDescriptors, image, mode){
  if(image.src !== null){
    image.crossOrigin = 'anonymous';

    const imageLoadPromise = new Promise((resolve, reject) => {
        const img1 = new Image();
        img1.onerror = reject;
        img1.crossOrigin = 'anonymous'; 
        img1.src = image.src;
        if(image.hasAttribute('data-src')){
          img1.src = image.getAttribute('data-src');
        }
        if(image.hasAttribute('data-pagespeed-lazy-src')){
          img1.src = image.getAttribute('data-pagespeed-lazy-src');
        }
        if(image.hasAttribute('data-original')){
          img1.src = image.getAttribute('data-original');
        }
        img1.onload = () => resolve(img1);
    });
    await imageLoadPromise.then(async (img) => {
      let detections;
      if(mode === 'tiny' || mode === null){
        detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      }
      else if(mode === 'bigger'){
        detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      }

      for(const detection of detections){
        if(detection){
          for (const val of savedDescriptors){ 
            const savedDescriptor = new Float32Array(Object.values(JSON.parse(val)));
            const distance = await faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
            if(distance <= 0.6){
            
              chrome.storage.local.get(['circle', 'colorMask'], function(result) {
                useCircle = result.circle;
                color = result.colorMask || '#F2CCB7';

                const canvas = drawMask(detection, img);
                setImageSource(image, canvas.toDataURL('image/png'));
                canvas.remove();
              });

            }
          }
        }
      }

    });
  }
};


async function faceVideo () {
  
  window.addEventListener('load', function() {

    // Disable buttons
    document.querySelector('.ytp-fullscreen-button').disabled = true;
    document.querySelector('.ytp-miniplayer-button').disabled = true;
    document.querySelector('.ytp-size-button').disabled = true;


    function handleVideoPlayback() {
      var video = document.querySelector('video');

      if (video && !video.paused) {
        console.log('Il video è in riproduzione...');


        chrome.storage.local.get().then((all) => {
          let divs = [];
          let mode;
          let savedDescriptors = [];
      
          for (const [key, val] of Object.entries(all)){
            if(key.startsWith('activeModel')){
              mode = val;
            }
            if(key.startsWith('folder')){
              if(val[2] === "On"){
                divs.push(key);
              }
            }
          }
          for (const [key, val] of Object.entries(all)){
            for (const div of divs){
              if(key.startsWith('imageOfFolder'+div)){
                savedDescriptors.push(val[0]);
              }
            }
          }

          chrome.storage.local.get(['circle', 'colorMask'], function(result) {
            useCircle = result.circle;
            color = result.colorMask || '#F2CCB7';
          });
        
          const canvas = faceapi.createCanvas(video);
          var container = document.getElementsByClassName("html5-video-container")[0];
          container.append(canvas)

          canvas.style.position = "absolute";

          var displaySize = { width: video.style.width.substring(0, 3), height: video.style.height.substring(0, 3) };
          faceapi.matchDimensions(canvas, displaySize);
          
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          let lastFaceDetectedTime = 0;
          let overlay = false;

          setInterval(async () => {

            // check dim change
            var newDisplaySize = { width: video.style.width.substring(0, 3), height: video.style.height.substring(0, 3) };
            if(displaySize.width != newDisplaySize.width || displaySize.height != newDisplaySize.height) {
              displaySize = newDisplaySize;
              faceapi.matchDimensions(canvas, displaySize);
            }


            let detections;
            if(mode === 'tiny' || mode === null){
              detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
            }
            else if(mode === 'bigger'){
              detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
            }

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            let faceDetected = false;

            for(const detection of resizedDetections){
              if(detection){
                for (const val of savedDescriptors){ 
                  const savedDescriptor = new Float32Array(Object.values(JSON.parse(val)));
                  const distance = await faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
                  if(distance <= 0.6){
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);                  

                    const { x, y, width, height } = detection.detection._box;
    
                    if (useCircle) {
                      ctx.fillStyle = color;
                      ctx.beginPath();
                      ctx.arc(x + (width/2), y + (height/3), height/1.5, 0, 2 * Math.PI, false);
                      ctx.closePath();
                      ctx.fill();
                    } else {
                      ctx.drawImage(imageIcon, x - (width/4), y - (height/2), width + (width/2), height + (height/2));
                    }
                

                    faceDetected = true;
                    overlay = true;
                    lastFaceDetectedTime = Date.now(); // istante dell'ultimo volto rilevato
                  }
                  else {
                    faceDetected = false;
                  }
                  // else{
                    // toglie appena non riconosce
                    // ctx.clearRect(0, 0, canvas.width, canvas.height);
                  //}

                }
              }
              
            }

            // Rimuovi l'overlay solo se è passato un certo intervallo di tempo dall'ultimo volto rilevato
            const overlayTimeout = 1000; // Tempo in millisecondi
            if (!faceDetected && (Date.now() - lastFaceDetectedTime) > overlayTimeout && overlay) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              console.log("Rimuovo overlay");
              overlay = false;
            }

          }, 200);

        });

      }
      
    }


    function checkVideoReady() {
      var video = document.querySelector('video');
      if (video && video.readyState >= 2) {
        handleVideoPlayback();
      } else {
        setTimeout(checkVideoReady, 200);
      }
    }

    checkVideoReady();

  });
}




chrome.storage.local.get().then((all) => {
  let divs = [];
  let model;
  let savedDescriptors = [];

  imageIcon = new Image();
  imageIcon.src = chrome.runtime.getURL('icon.png');

  let intersections = {}

  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('activeModel')){
      model = val;
    }
    if(key.startsWith('folder')){
      if(val[2] === "On"){
        divs.push(key);
      }
    }
  }
  for (const [key, val] of Object.entries(all)){
    for (const div of divs){
      if(key.startsWith('imageOfFolder'+div)){
        savedDescriptors.push(val[0]);
      }
    }
  }
  loadModels().then(function(){
    if(savedDescriptors.length > 0){
      console.log("1-Detection");
      const intersectionObserver = new IntersectionObserver(function(entries, observer){
        entries.forEach(entry => {
          if(entry.isIntersecting){
            if(model === 'auto'){
              if(!intersections[entry.time]){
                intersections[entry.time] = {entriesTimed: []};
              }
              intersections[entry.time].entriesTimed.push(entry)
              
              if(intersections[entry.time].timer) {
                clearTimeout(intersections[entry.time].timer);
              }      

              intersections[entry.time].timer = setTimeout(() => {
                if(intersections[entry.time].entriesTimed.length > 2){
                  intersections[entry.time].entriesTimed.forEach((entry) => {
                    startBlocking(savedDescriptors, entry.target, 'tiny').then(() => {
                      observer.unobserve(entry.target)
                    });
                  })
                }
                else{
                  intersections[entry.time].entriesTimed.forEach((entry) => {
                    startBlocking(savedDescriptors, entry.target, 'bigger').then(() => {
                      observer.unobserve(entry.target)
                    });
                  })
                }
                delete intersections[entry.time];
              }, 100);
            }
            else{
              startBlocking(savedDescriptors, entry.target, model).then(() => {
                observer.unobserve(entry.target)
              });
            }
          }
        });
      });
      
      document.querySelectorAll('img').forEach((image) => {
        intersectionObserver.observe(image);
      });
      
      const mutationObserver = new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
          if (mutation.type === 'childList') {
            for (let node of mutation.addedNodes) {
              if (node instanceof HTMLElement) {
                if(node.tagName === 'IMG'){
                  intersectionObserver.observe(node)
                }
                else{
                  node.querySelectorAll('img').forEach((image) => {
                    image.onload = function(){
                      intersectionObserver.observe(image)
                    }
                  });
                }
              }
            }
          }
        }
      });

      const targetNode = document.body;
      const config = {childList: true, subtree: true};

      mutationObserver.observe(targetNode, config);

      //2-Detection
      console.log("2-Detection");
      if(location.href.includes("youtube.com/watch")) {
        faceVideo();
      }


      /* let currentVideo = "";
      chrome.runtime.onMessage.addListener((message, sender, response) => {

        if (message.type === "NEW" && message.videoId !== currentVideo) {
          currentVideo = message.videoId;
          
          console.log("New youtube video");
          faceVideo()
        }

      }); */

    }
  });
});