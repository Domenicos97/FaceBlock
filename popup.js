const noFolder = document.getElementById('noFolder');
const noImages = document.getElementById('noImages');
const noImage = document.getElementById('noImage');
const tinyModelButton = document.getElementById('tiny-model');
const biggerModelButton = document.getElementById('bigger-model'); 
const autoModelButton = document.getElementById('auto-model');
const lightThemeButton = document.getElementById('light-theme');
const darkThemeButton = document.getElementById('dark-theme');
const onButton = document.getElementById('on-button');
const offButton = document.getElementById('off-button'); 
const loadingDiv = document.getElementById('loading');
const selectAll = document.getElementById('selectAll');

let useCircle;
let color;


async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.tinyFaceDetector.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model')
    ]);
  } catch (error) {
    console.error(error);
  }
}

async function thereIsFolders(){
  try {
    const all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key.startsWith('folder')){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }
}

async function thereIsImages(divId){
  try {
    const all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key.startsWith('imageOfFolder'+divId)){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }
}

async function detectFaceForFolders(result, filename){
  let face;
  let descriptor;
  let noDetection = false;
  let moreDetections = false;

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
      if(detections.length === 1){
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(img,
          detections[0].detection.box.x,
          detections[0].detection.box.y,
          detections[0].detection.box.width,
          detections[0].detection.box.height,
          0, 0, img.width, img.height
        );
        face = canvas.toDataURL('image/jpeg');
        descriptor = detections[0].descriptor;
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
            console.log("Ok");
          }
        });
      }
      else if(moreDetections){
        chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
          if(response){
            console.log("Ok");
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
  }  
  return [face, descriptor];
}

async function detectFace(result, filename){
  let faces = [];
  let descriptors = [];
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
          canvas.width = img.width;
          canvas.height = img.height;
          const context = canvas.getContext('2d', {willReadFrequently: true});
          context.drawImage(img,
            detection.detection.box.x,
            detection.detection.box.y,
            detection.detection.box.width,
            detection.detection.box.height,
            0, 0, img.width, img.height
          );
          faces.push(canvas.toDataURL('image/jpeg'));
          descriptors.push(detection.descriptor);
          canvas.remove();
        }
      }
      else{
        noDetection = true;
      }
    }).then(() => {
      if(noDetection){
        chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
          if(response){
            console.log("Ok");
          }
        });
      }
    })
  } catch (error) {
    console.error(error);
  }  

  return [faces, descriptors];
}

async function getFolders(){
  try{
    const all = await chrome.storage.local.get();
    for (const [key, val] of Object.entries(all)){
      if(key.startsWith('folder')){
        constructCardFolder(key, val[0], val[1], val[2], val[3]);
      }
    }
    loadingDiv.setAttribute('hidden', 'hidden');
  } catch (error) {
    console.error(error);
  }  
}

async function getImages(divId){
  try{
    const all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key.startsWith('imageOfFolder'+divId)){
        const face = key.slice(key.indexOf("data:image"));
        constructDivImage(divId, face);
      }
    } 
    loadingDiv.setAttribute('hidden', 'hidden');
  } catch (error) {
    console.error(error);
  }  
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

async function setModels(){
  try{
    const model = await chrome.storage.local.get("activeModel");
    if(Object.values(model).length === 0){
      chrome.storage.local.set({"activeModel": 'tiny'})
    }
    else if(Object.values(model)[0] === "tiny"){
      biggerModelButton.classList.remove('active');
      autoModelButton.classList.remove('active');
      tinyModelButton.classList.add('active')

    }
    else if(Object.values(model)[0] === "bigger"){
      tinyModelButton.classList.remove('active');
      autoModelButton.classList.remove('active');
      biggerModelButton.classList.add('active')
    }
    else if(Object.values(model)[0] === "auto"){
      tinyModelButton.classList.remove('active');
      biggerModelButton.classList.remove('active')
      autoModelButton.classList.add('active');
    }
  } catch (error) {
    console.error(error);
  }  
}

// Solo se rimane tempo
async function setTheme(){
  try{
    const theme = await chrome.storage.local.get("activeTheme");
    /* const tabButton = document.querySelectorAll(".tab-button"); */
    
    if(Object.values(theme).length === 0){
      chrome.storage.local.set({"activeTheme": 'light'})
    }
    else if(Object.values(theme)[0] === "light"){
      darkThemeButton.classList.remove('active');
      lightThemeButton.classList.add('active')
      
      document.querySelectorAll('.info').forEach(e => e.style.color = "black");
      document.querySelectorAll('.content').forEach(e => e.style.background = "white");

      /* tabButton.forEach(e => e.style.background = "#bccbe9"); */
    }
    else if(Object.values(theme)[0] === "dark"){
      lightThemeButton.classList.remove('active');
      darkThemeButton.classList.add('active')

      document.querySelectorAll('.info').forEach(e => e.style.color = "white");
      document.querySelectorAll('.content').forEach(e => e.style.background = "grey");

      /* tabButton.forEach(e => e.style.background = "grey");

      // Aggiungi un listener per l'entrata del mouse
      tabButton.forEach(e => e.addEventListener("mouseover", function() {
          e.style.background = "#d5e3ff";
      }));

      // Aggiungi un listener per l'uscita del mouse
      tabButton.forEach(e => e.addEventListener("mouseleave", function() {
          e.style.background = "grey";
      }));

      // Aggiungi un listener per il click
      tabButton.forEach(e => e.addEventListener("click", function() {
          tabButton.forEach(e => e.style.background = "grey");
          e.style.background = "white";
      }));


    

      tabButton.forEach(e => e.addEventListener("mouseover", function() {
          e.style.background = "#d5e3ff";
      }));


      // Variabile di controllo per l'evento mouseleave
      var mouseleaveAttivo = true;

      tabButton.forEach(e => e.addEventListener("mouseleave", function() {
        if(Object.values(theme)[0] === "light")
          e.style.background = "#bccbe9";
        else
          e.style.background = "grey";

        // Controlla se l'evento mouseleave deve essere interrotto
        if (!mouseleaveAttivo) {
          e.stopPropagation();
          console.log('L\'evento mouseleave è stato interrotto.');
          // Reimposta la variabile di controllo
          mouseleaveAttivo = true;
        }
      }));

      tabButton.forEach(e => e.addEventListener("click", function() {
        mouseleaveAttivo = false;

        if(Object.values(theme)[0] === "light") {
          e.style.background = "white";
        }
        else{
          e.style.background = "white";
        }
      })); */
    }
  } catch (error) {
    console.error(error);
  }  
}

function updateButtonCardFolder(key, mode){
  div = document.getElementById(key);
  let button = div.childNodes[1].childNodes[2];
  if(mode === "On"){
    button.classList.remove("btn-danger");
    button.classList.add("btn-success");
    button.innerText = mode;
  }
  else if(mode === "Off"){
    button.classList.add("btn-danger");
    button.classList.remove("btn-success");
    button.innerText = mode;
  }
}

function maskManager() {
  const cerchioRadio = document.getElementById('cerchioRadio').checked;
  const coloreCerchio = document.getElementById('selettore-colore-cerchio').value;
  
  if(cerchioRadio) {
    document.getElementById('selettoreColore').style.display = 'block';
    chrome.storage.local.set({ circle: true });
    chrome.storage.local.set({ 'colorMask': coloreCerchio });
  }
  else {
    document.getElementById('selettoreColore').style.display = 'none';
    chrome.storage.local.set({ circle: false });
  }
}

function setCircleMask() {
  chrome.storage.local.get(['colorMask'], function(result) {
    if(result.colorMask) {
      document.getElementById('selettore-colore-cerchio').setAttribute("value", result.colorMask);
    }
    else {
      document.getElementById('selettore-colore-cerchio').setAttribute("value", "#F2CCB7");
    }
  });
}


document.addEventListener('DOMContentLoaded', async function() {
  addLoadingDiv("Loading models...");
  loadModels().then(() => {
    setModels();
    setTheme();
    setCircleMask();

    
    
    chrome.storage.local.get(['circle'], function(result) {
      const isCircleEnabled = result.circle;
      document.getElementById('immagineRadio').checked = !isCircleEnabled;
      document.getElementById('cerchioRadio').checked = isCircleEnabled;
      maskManager();
    });

    document.getElementById('selettore-colore-cerchio').addEventListener('change', maskManager);
    document.getElementById('immagineRadio').addEventListener('change', maskManager);
    document.getElementById('cerchioRadio').addEventListener('change', maskManager);




    thereIsFolders().then((response) => {
      if(response){
        noFolder.setAttribute('hidden','hidden');
        selectAll.removeAttribute('hidden');
        addLoadingDiv("Loading folders...");
      }
      else{
        noFolder.removeAttribute('hidden');
        selectAll.setAttribute('hidden','hidden');
        loadingDiv.setAttribute('hidden','hidden');
      }
    })
    getFolders();

    const dropZoneFolders = document.getElementById('drop-zone-folders');
    const chooseFaceFolder= document.getElementById('choose-face-folder');
    const uploadFaceFolder = document.getElementById('upload-face-folder');

    dragover = function(event){
      event.preventDefault();
    };

    drop = function(event){
      event.preventDefault();
      dropZoneFolders.classList.remove('dragover');
      const files = event.dataTransfer.files;
      const promises = [];
      addLoadingDiv("Folder creation in progress. Don't close the popup window");
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const promise = new Promise((resolve) => {
          reader.onload = () => {
            detectFaceForFolders(reader.result, file.name).then((response) => {
              if(response[0] !== undefined){
                noFolder.setAttribute('hidden','hidden');
                selectAll.removeAttribute('hidden');
                const divId = crypto.randomUUID();
                const imgSrc = response[0];
                const inputValue = "Untitled folder";
                const bTextContent = "On";
                const bClassName = "btn btn-success";
                chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]}).then(async() => {
                  try{
                    await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [JSON.stringify(response[1])]});
                    constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName);
                    chrome.runtime.sendMessage({type: 'addedFolder'}, (response) => {
                      if(response === true){
                        console.log("Cartella aggiunta");
                      }
                      else{
                        console.log("Errore nell'aggiunta della cartella");
                      }
                    });
                    chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
                      if(response === true){
                        console.log("Cartella aggiunta al menu contestuale");
                      }
                      else{
                        console.log("Errore nell'aggiunta della cartella");
                      }
                    });
                  } catch (error) {
                    console.error(error);
                  }  
                });
              }
              resolve();
            });
          }
        });
        promises.push(promise);
      }
      Promise.all(promises).then(() => {
        loadingDiv.setAttribute('hidden', 'hidden');
      });
    };

    change = function(){
      const files = chooseFaceFolder.files;
      if(files.length > 0){
        const promises = [];
        addLoadingDiv("Folder creation in progress. Don't close the popup window");
        for (const file of files) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          const promise = new Promise((resolve) => {
            reader.onload = () => {
              detectFaceForFolders(reader.result, file.name).then((response) => {
                if(response[0] !== undefined){
                  noFolder.setAttribute('hidden','hidden');
                  selectAll.removeAttribute('hidden');
                  const divId = crypto.randomUUID();
                  const imgSrc = response[0];
                  const inputValue = "Untitled folder";
                  const bTextContent = "On";
                  const bClassName = "btn btn-success";
                  chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]}).then(async() => {
                    try{
                      await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [JSON.stringify(response[1])]});
                      constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName);
                      chrome.runtime.sendMessage({type: 'addedFolder'}, (response) => {
                        if(response === true){
                          console.log("Cartella aggiunta");
                        }
                        else{
                          console.log("Errore nell'aggiunta della cartella");
                        }
                      });
                      chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
                        if(response === true){
                          console.log("Cartella aggiunta al menu contestuale");
                        }
                        else{
                          console.log("Errore nell'aggiunta della cartella");
                        }
                      });
                    } catch (error) {
                      console.error(error);
                    }  
                  });
                }
                resolve();
              })
            }
          })
          promises.push(promise);
        }
        Promise.all(promises).then(() => {
          loadingDiv.setAttribute('hidden', 'hidden');
        });
      }
    };

    click = function(){
      chooseFaceFolder.click();
    };

    dropZoneFolders.addEventListener('dragover', dragover);
    dropZoneFolders.addEventListener('drop', drop);
    chooseFaceFolder.addEventListener('change', change);
    uploadFaceFolder.addEventListener('click', click);

    tinyModelButton.addEventListener('click', () => {
      if(biggerModelButton.classList.contains('active') || (autoModelButton.classList.contains('active'))){
        biggerModelButton.classList.remove('active');
        autoModelButton.classList.remove('active');
        tinyModelButton.classList.add('active')
        chrome.storage.local.set({"activeModel": 'tiny'})
      }
    });

    biggerModelButton.addEventListener('click', () => {
      if(tinyModelButton.classList.contains('active') || (autoModelButton.classList.contains('active'))){
        tinyModelButton.classList.remove('active');
        autoModelButton.classList.remove('active');
        biggerModelButton.classList.add('active')
        chrome.storage.local.set({"activeModel": 'bigger'})
      }
    });

    autoModelButton.addEventListener('click', () => {
      if(tinyModelButton.classList.contains('active') || (biggerModelButton.classList.contains('active'))){
        tinyModelButton.classList.remove('active');
        biggerModelButton.classList.remove('active');
        autoModelButton.classList.add('active')
        chrome.storage.local.set({"activeModel": 'auto'})
      }
    });

    onButton.addEventListener('click', () => {
      chrome.storage.local.get().then((all) => {
        for (const [key, val] of Object.entries(all)){
          if(key.startsWith('folder')){
            chrome.storage.local.set({[key]: [val[0], val[1], "On", "btn btn-success"]}).then(() => {
              updateButtonCardFolder(key, "On");
            });
          }
        }
      })
    });

    offButton.addEventListener('click', () => {
      chrome.storage.local.get().then((all) => {
        for (const [key, val] of Object.entries(all)){
          if(key.startsWith('folder')){
            chrome.storage.local.set({[key]: [val[0], val[1], "Off", "btn btn-danger"]}).then(() => {
              updateButtonCardFolder(key, "Off");
            });
          }
        }
      })
    });


    lightThemeButton.addEventListener('click', () => {
      darkThemeButton.classList.remove('active');
      lightThemeButton.classList.add('active')
      chrome.storage.local.set({"activeTheme": 'light'})
    });

    darkThemeButton.addEventListener('click', () => {
      lightThemeButton.classList.remove('active');
      darkThemeButton.classList.add('active')
      chrome.storage.local.set({"activeTheme": 'dark'})
    });


    const tabs = document.querySelector(".wrapper");
    const tabButton = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".content");

    tabs.onclick = e => {
      const id = e.target.dataset.id;
      if (id) {
        tabButton.forEach(btn => {
          btn.classList.remove("active");
        });
        e.target.classList.add("active");

        contents.forEach(content => {
          content.classList.remove("active");
        });
        const element = document.getElementById(id);
        element.classList.add("active");
      }
    }

  });
});

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

function addLoadingDiv(text){
  let p = loadingDiv.lastElementChild.lastElementChild;
  p.innerText = text;
  loadingDiv.removeAttribute('hidden');
}

async function initializeDropAreaListeners(divId){
  const buttonBack = document.getElementById('back')
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('choose-face');
  const iconUpload = document.getElementById('upload-face');

  dragover = function(event){
    event.preventDefault();
  };

  function processFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        detectFace(reader.result, file.name).then((response) => {
          if(response[0].length > 0){
            for(let i=0; i<response[0].length; i++){
              isInStorage('imageOfFolder'+divId+response[0][i]).then((result) => {
                if(!result){
                  noImages.setAttribute('hidden','hidden');
                  chrome.storage.local.set({['imageOfFolder'+divId+response[0][i]]: [JSON.stringify(response[1][i])]}).then(() => {
                    constructDivImage(divId, response[0][i]);
                    chrome.runtime.sendMessage({type: 'addedImage', content: file.name}, (response) => {
                      if(response){
                        console.log("Ok");
                      }
                    });
                  });
                }
                else{
                  chrome.runtime.sendMessage({type: 'existingImage', content: file.name}, (response) => {
                    if(response){
                      console.log("Ok");
                    }
                  });
                }
                resolve();
              })
            }
          }
          else{
            resolve();
          }
        });
      }
    });
  }

  drop = async function(event){
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    addLoadingDiv("Importing images in progress. Don't close the popup window");
    const promises = [];
    for (const file of files) {
      try{ 
        let promise = await processFile(file);
        promises.push(promise);
      } catch (error) {
        console.error(error);
      }  
    }
    Promise.all(promises).then(() => {
      loadingDiv.setAttribute('hidden', 'hidden');
    });
  };

  change = async function(){
    const files = fileInput.files;
    if(files.length > 0){
      addLoadingDiv("Importing images in progress. Don't close the popup window");
      const promises = [];
      for (const file of files) {
        try{
          let promise = await processFile(file);
          promises.push(promise);
        } catch (error) {
          console.error(error);
        }  
      }
      Promise.all(promises).then(() => {
        loadingDiv.setAttribute('hidden', 'hidden');
      });
    }
  };

  click = function(){
    fileInput.click();
  };

  dropZone.addEventListener('dragover', dragover);
  dropZone.addEventListener('drop', drop);
  fileInput.addEventListener('change', change);
  iconUpload.addEventListener('click', click);

  buttonBack.addEventListener('click', () => {
    const divFolders = document.getElementById('folders-area');
    const divImages = document.getElementById('drop-area');

    const previewImages = document.getElementsByClassName('preview')[1];
    removeAllChildNodes(previewImages);

    dropZone.removeEventListener('dragover', dragover);
    dropZone.removeEventListener('drop', drop);
    fileInput.removeEventListener('change', change);
    iconUpload.removeEventListener('click', click);

    divImages.setAttribute('hidden', 'hidden');
    divFolders.removeAttribute('hidden')
  });
}

function constructCardFolder(divId, imgSrc, inputValue, bTextContent, bClassName){
  const preview = document.getElementsByClassName('preview')[0];

  const div1 = document.createElement('div');
  div1.id = divId;
  div1.className = "card";
  div1.style.width = '150px';

  const img = new Image();
  img.className = "card-img-top";
  img.draggable = false;
  img.src = imgSrc;
  img.style.width = '150px';
  img.style.height = '150px';
  img.addEventListener('click', () => {
    initializeDropAreaListeners(divId).then(()=>{
      thereIsImages(divId).then((response) => {
        if(response){
          noImages.setAttribute('hidden','hidden');
          addLoadingDiv("Loading faces");
        }
        else{
          noImages.removeAttribute('hidden');
          loadingDiv.setAttribute('hidden','hidden');
        }
      })
      getImages(divId);
    });
    const divFolders = document.getElementById('folders-area');
    const divImages = document.getElementById('drop-area');
    divFolders.setAttribute('hidden', 'hidden');
    divImages.removeAttribute('hidden')
  })  

  img.addEventListener('contextmenu', function(event){
    event.preventDefault();
  })
  const div2 = document.createElement('div');
  div2.className = "card-body";

  const input = document.createElement('input');
  input.type = "text";
  input.style.width = '120px';
  input.placeholder = "Scegli un nome";
  input.style.border = "None";
  input.value = inputValue;

  input.addEventListener("change", (event) => {
    chrome.storage.local.set({[divId]: [img.src, event.target.value, button1.textContent, button1.className]}).then(()=>{
      chrome.runtime.sendMessage({type: 'updateFolderForContext', content: divId}, (response) => {
        if(response === true){
          console.log("Cartella aggiunta");
        }
        else{
          console.log("Errore nell'aggiunta della cartella");
        }
      });
    });
  });

  const hr = document.createElement('hr');

  const button1 = document.createElement('button');
  button1.className = bClassName;
  button1.style.height = '40px';
  button1.textContent = bTextContent;

  button1.addEventListener('click', (event) => {
    if(event.target.textContent === 'On'){
      button1.className = "btn btn-danger";
      button1.textContent = "Off"
      chrome.storage.local.set({[divId]: [img.src, input.value, button1.textContent, button1.className]})
    }
    else if(event.target.textContent === 'Off'){
      button1.className = "btn btn-success";
      button1.textContent = "On"
      chrome.storage.local.set({[divId]: [img.src, input.value, button1.textContent, button1.className]})
    }
  })

  const button2 = document.createElement('button');
  button2.style.height = '40px';
  button2.style.position = 'relative';
  button2.style.left = '30px';
  button2.className = "btn btn-danger";

  button2.addEventListener('click', () => {
    icon.className = "fas fa-circle-notch fa-spin";
    chrome.runtime.sendMessage({type: 'removedFolderForContext', content: divId}, (response) => {
      if(response === true){
        chrome.storage.local.get().then((all) => {
          for(const key of Object.keys(all)){
            if(key.startsWith('imageOfFolder'+divId)){
              chrome.storage.local.remove(key);
            }
          }
        }).then(() => {
          chrome.storage.local.remove(divId).then(() => {
            preview.removeChild(div1);
            console.log("Cartella rimossa");
            thereIsFolders().then((response) => {
              if(response){
                // se ci sono cartelle
                noFolder.setAttribute('hidden','hidden');
                selectAll.removeAttribute('hidden');
              }
              else{
                noFolder.removeAttribute('hidden');
                selectAll.setAttribute('hidden','hidden');
              }
            })
          });
        });
      }
      else{
        console.log("Errore nella rimozione della cartella");
      }
    });
  }, {once: true});

  const icon = document.createElement('icon');
  icon.className = "fa fa-trash";

  button2.appendChild(icon);

  div2.appendChild(input);
  div2.appendChild(hr);
  div2.appendChild(button1);
  div2.appendChild(button2);

  div1.appendChild(img);
  div1.appendChild(div2);

  preview.appendChild(div1);
}

function constructDivImage(divId, photo){
  const preview = document.getElementsByClassName('preview')[1];
  
  const container = document.createElement('div')
  container.className = 'container';
  container.style.position = 'relative';
  container.style.width = '150px';
  container.style.height = '150px';
  container.style.margin = '0px';
  container.style.padding = '0px';

  const img = new Image();
  img.src = photo;
  img.draggable = false;
  img.style.transition = '.3s ease';

  const x_div = document.createElement('div');
  x_div.className = 'topright';
  x_div.style.position = 'absolute';
  x_div.style.margin = '0px';
  x_div.style.top = '8px';
  x_div.style.right = '3px';
  x_div.style.fontSize = '18px';

  const a = document.createElement('a');
  a.href = '#';
  a.className = 'icon';
  a.style.color = 'red';
  a.style.position = 'relative';
  a.style.fontSize = '25px';
  a.style.right = '10px';
  a.style.top = '5px';
  a.style.opacity = 0;
  a.style.transition = ".3s ease";
  
  const icon = document.createElement('icon');
  icon.className = 'fa-solid fa-x'

  a.onmouseover = function(){
    this.style.opacity = 1;
    img.style.opacity = 0.3;
  }
  
  a.addEventListener('click', () => {
    chrome.storage.local.remove('imageOfFolder'+divId+photo).then(()=>{
      thereIsImages(divId).then((response) => {
        if(response){
          noImages.setAttribute('hidden','hidden')
        }
        else{
          noImages.removeAttribute('hidden')
        }
      })
      preview.removeChild(container);
    });
  }, {once: true});

  img.onmouseover = function(){
    a.style.opacity = 1;
    this.style.opacity = 0.3;
  }

  img.onmouseout = function(){
    a.style.opacity = 0;
    this.style.opacity = 1;
  }

  img.addEventListener('contextmenu', function(event){
    event.preventDefault();
  })
  
  container.appendChild(img);
  a.appendChild(icon);
  x_div.appendChild(a);
  container.appendChild(x_div);
  preview.appendChild(container);
}










async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


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

  return canvas
}


async function uploadImage() {

  noImage.setAttribute('hidden','hidden');
  addLoadingDiv("Processing image...");

  let imgLink = URL.createObjectURL(inputFile.files[0]);

  const blob = await fetch(imgLink).then((response) => response.blob());
  const dataUrl = await blobToBase64(blob);

  let img = new Image()
  img.src = dataUrl;
  img.crossOrigin = 'anonymous'


  chrome.storage.local.get().then( async (all) => {
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

            const canvas = drawMask(detection, img);    
            img.src = canvas.toDataURL('image/png');
            canvas.remove();
          }
        }
      }
    }


    imageView.src = img.src;
    imageContainer.style.display = 'block';


    downloadButton.href = img.src
    downloadButton.style.display = 'block';

    shareButton.style.display = 'block';


    // scroll yourImageArea
    document.getElementById('yourImageArea').scrollIntoView({ behavior: "smooth" });
    

    var imageURL = img.src;
    chrome.storage.local.set({ 'imageURL': imageURL });


    // Share image
    const url = "https://api.imgbb.com/1/upload?expiration=600&key=1833b1b6a5fff7d5a37839ba6dce2f5d";     // 600 seconds (10 minutes) to share image
    const imageBase64 = imageURL.split(",")[1];

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `image=${encodeURIComponent(imageBase64)}`
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Errore nella richiesta: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {

        console.log("Risposta ricevuta:", data);
        console.log("Saved Share URL:", data.data.url);

        localStorage.setItem('shareURL', data.data.url);

        loadingDiv.setAttribute('hidden', 'hidden');
            
      })
      .catch(error => {
        console.error("Errore:", error);
      });

  });
}


// drag and drop
const dropArea = document.getElementById("drop-myZone");
const inputFile = document.getElementById("choose-myFace");
const iconUpload = document.getElementById('upload-myFace');

const imageContainer = document.getElementById('imageContainer');

const imageView = document.getElementById("imagePreview");
imageContainer.style.display = 'none';

inputFile.addEventListener("change", uploadImage);

dropArea.addEventListener("dragover", function(e) {
    e.preventDefault();
});


dropArea.addEventListener("drop", function(e) {
    e.preventDefault();
    inputFile.files = e.dataTransfer.files;
    uploadImage();
});


click = function(){
  inputFile.click();
};

iconUpload.addEventListener('click', click);


let imageIcon = new Image();
imageIcon.src = chrome.runtime.getURL('icon.png');


function formatDateTime(date) {
  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var year = date.getFullYear();
  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');

  var formattedDateTime = day + '-' + month + '-' + year + ' ' + hours + '-' + minutes;

  return formattedDateTime;
}

var currentDate = new Date();
var formattedDate = formatDateTime(currentDate);


// download button
let downloadButton = document.getElementById("downloadButton");
downloadButton.style.display = 'none';

downloadButton.download = formattedDate;



function shareFunction() {

  // Verifica se l'elemento è attualmente nascosto
  if (downloadButton.style.display === 'none') {
    // Mostra l'elemento
    downloadButton.style.display = 'block';
  } else {
      // Nascondi l'elemento
      downloadButton.style.display = 'none';
  }

  var x = document.getElementById("myDIV");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }

  // Scroll bottom
  x.scrollIntoView({ behavior: "smooth" });

  
  const retrievedValue = localStorage.getItem('shareURL');
  console.log('Retrieved Share URL:', retrievedValue);

  const link = encodeURI(retrievedValue);
  const msg = encodeURIComponent('Message example');
  const title = encodeURIComponent('Title example');

  const fb = document.querySelector('.facebook');
  fb.href = `https://www.facebook.com/share.php?u=${link}&display=iframe`;

  const twitter = document.querySelector('.twitter');
  twitter.href = `http://twitter.com/share?&url=${link}&text=${msg}&hashtags=example1,example2`;

  const linkedIn = document.querySelector('.linkedin');
  linkedIn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${link}`;

  const reddit = document.querySelector('.reddit');
  reddit.href = `http://www.reddit.com/submit?url=${link}&title=${title}`;

  const whatsapp = document.querySelector('.whatsapp');
  whatsapp.href = `https://api.whatsapp.com/send?text=${msg}: ${link}`;

  const telegram = document.querySelector('.telegram');
  telegram.href = `https://telegram.me/share/url?url=${link}&text=${msg}`;
}


let shareButton = document.getElementById("shareButton");
shareButton.addEventListener('click', shareFunction)
shareButton.style.display = 'none';
let myDiv = document.getElementById('myDIV');
myDiv.style.display = 'none';



function getImageFromStorage(callback) {
  chrome.storage.local.get('imageURL', function(data) {
    var imageURL = data.imageURL || null;
    callback(imageURL);
  });
}

getImageFromStorage(function(imageURL) {
  if(imageURL){
    noImage.setAttribute('hidden','hidden');
    console.log('Retrieved image URL:', imageURL);
    imageView.src = imageURL;
    imageContainer.style.display = 'block';

    downloadButton.href = imageURL;
    downloadButton.style.display = 'block';
    shareButton.style.display = 'block';
  }
});



function deleteImage() {
  imageContainer.style.display = 'none';

  chrome.storage.local.remove('imageURL');
  localStorage.removeItem('shareURL');

  downloadButton.style.display = 'none';
  shareButton.style.display = 'none';

  noImage.removeAttribute('hidden');
}

const deleteButton = document.getElementById("deleteButton");
deleteButton.addEventListener("click", deleteImage);


// After 10 minutes delete image
setTimeout(function() {
  deleteImage();
}, 10 * 60 * 1000);