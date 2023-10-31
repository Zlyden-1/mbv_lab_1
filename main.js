const pictureContainer = document.getElementById("picture__container");
const zoomContainer = document.getElementById("zoom__container");
const overviewContainer = document.getElementById("overview__container");
const offset = document.getElementById("offset");
const input = document.getElementById("input");
const zoomInput = document.getElementById("zoom__input");
const xField = document.getElementById("x");
const yField = document.getElementById("y");
const brightnessField = document.getElementById("brightness");
const zoomAreaParams = {left: 0, top: 0, size: 0}
let fileDataBuffer, pictureParams, pictureData, picture, pictureCtx, zoom, zoomCtx, zoomBounds, zoomLevel, pictureDataWithOffset, overview, overviewCtx, sizeModifier;
let fixZoomArea = false;

const pickCoordinates = (event) => {
    const bounding = picture.getBoundingClientRect();
    const x = parseInt(event.clientX - bounding.left);
    const y = parseInt(event.clientY - bounding.top);
    let colorData = 0;
    if (typeof pictureParams != 'undefined') {
        colorData = pictureData[y][x];
    }
    return {x, y, colorData}    
}

const addZoomBounds = () => {
    if (typeof zoomBounds != 'undefined'){
        zoomBounds.remove();
    }
    if (typeof pictureParams != 'undefined'){
        zoomCtx.clearRect(0, 0, pictureParams[0], pictureParams[0])
        zoomLevel = zoomInput.value;
        const width = pictureParams[0];
        const height = pictureParams[1];
        // const size = parseInt(width/zoomLevel);
        const interpolationUnitSize = 2*zoomLevel-1 // размер фрагмента 2х2 пиксела после интерполяции
        const size = parseInt((width-1)/(interpolationUnitSize-1))+1
        zoomAreaParams.size = size;
        const halfSize = parseInt(size/2);
        const bounding = pictureContainer.getBoundingClientRect();
        zoomBounds = document.createElement("div");
        zoomBounds.style.width = size + 'px';
        zoomBounds.style.height = size + 'px';
        zoomBounds.style.border = "1px solid white";
        zoomBounds.style.position = "absolute";
        zoomBounds.style.zIndex = "999";
        zoomBounds.style.transform = "translateY(-50%) translateX(-50%)";
        zoomBounds.style.pointerEvents = "none"
        pictureContainer.appendChild(zoomBounds)
        picture.addEventListener("mousemove", e => { // при движении курсора
            const target = e.target; // определяем, где находится курсор
            if (!target || fixZoomArea) return;
            let left = e.pageX;
            let top = e.pageY;
            if (left-halfSize-bounding.left<=0) left = bounding.left + halfSize;
            else if (left+halfSize-bounding.left>=width) left = bounding.left + width - halfSize - 1;
            if (top-halfSize-bounding.top<=0) top = bounding.top + halfSize;
            else if (top+halfSize-bounding.top>=pictureContainer.offsetHeight) top = bounding.top + pictureContainer.offsetHeight - halfSize - 1;
            const {x, y, c} = pickCoordinates(e);
            zoomAreaParams.left = x - halfSize;
            if (zoomAreaParams.left < 0) zoomAreaParams.left = 0;
            else if (zoomAreaParams.left >= width - size) zoomAreaParams.left = width - size - 1;
            zoomAreaParams.top = y - halfSize;
            if (zoomAreaParams.top < 0) zoomAreaParams.top = 0;
            else if (zoomAreaParams.top >= width - size) zoomAreaParams.top = height - size - 1;
            zoomBounds.style.left = left + 'px'; // задаём элементу позиционирование слева
            zoomBounds.style.top = top + 'px'; // задаём элементу позиционирование сверху
            displayZoom(e)
        })
    }
}

zoomInput.addEventListener("change", addZoomBounds)


pictureContainer.addEventListener("click", e => {
    fixZoomArea = !fixZoomArea
    if (pictureContainer.style.overflowY == "scroll"){
        pictureContainer.style.overflowY = "hidden";
        displayZoom(e)
    }
    else {
        pictureContainer.style.overflowY = "scroll";
    }
})


const drawPicture = (ctx, width, height, data) => {
    const imageData = ctx.createImageData(width, height);
    let imageDataIndex = 0;
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            const pixelBrightness = data[i][j];
            imageData.data[imageDataIndex + 0] = pixelBrightness; // R value
            imageData.data[imageDataIndex + 1] = pixelBrightness; // G value
            imageData.data[imageDataIndex + 2] = pixelBrightness; // B value
            imageData.data[imageDataIndex + 3] = 255; // A value
            imageDataIndex += 4;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

const applyOffset = (data, offsetValue) => {
    const dataWithOffset = []
    for (let i = 0; i < data.length; i++) {
        dataWithOffset.push([]);
        for (let j = 0; j < data[i].length; j++) {
            dataWithOffset[i][j] = (data[i][j] >> offsetValue) & 0xFF;
        }
    }
    return dataWithOffset
}

const makeOverview = (data, modifier) => {
    const intModifier = parseInt(1/modifier)
    const overviewData = []
    let rowIndex = 0
    for (let i = 0; i < data.length; i+=intModifier){
        let columnIndex = 0;
        overviewData.push([]);
        for (let j = 0; j < data[i].length; j+=intModifier){
            overviewData[rowIndex][columnIndex] = data[i][j]
            columnIndex++
        }
        rowIndex++
    }
    console.log(overviewData);
    return overviewData
}

const displayPicture = () => {
    const bitOffset = offset.value;
    pictureDataWithOffset = applyOffset(pictureData, bitOffset)
    const overviewData = makeOverview(pictureDataWithOffset, sizeModifier)
    drawPicture(overviewCtx, parseInt(pictureParams[0]*sizeModifier), parseInt(pictureParams[1]*sizeModifier), overviewData)
    drawPicture(pictureCtx, pictureParams[0], pictureParams[1], pictureDataWithOffset)
}

const makeTwoDimentionalPictureData = (dataBuffer, byteOffset, width, height) => {
    const result = [];
    for (let i = 0; i < height; i++) {
        result.push(new Uint16Array(dataBuffer, byteOffset, width));
        byteOffset += width*2;
    }
    return result
}

input.onchange = async () => {
    fileDataBuffer = await input.files[0].arrayBuffer();
    pictureParams = new Uint16Array(fileDataBuffer, 0, 2);
    pictureData = makeTwoDimentionalPictureData(fileDataBuffer, 4, pictureParams[0], pictureParams[1]);
    if (typeof picture != 'undefined') picture.remove()
    picture = document.createElement("canvas");
    picture.width = pictureParams[0];
    picture.height = pictureParams[1];
    pictureCtx = picture.getContext("2d");
    pictureContainer.appendChild(picture);
    picture.addEventListener("mousemove", (event) => {
        const {x, y, colorData} = pickCoordinates(event);
        xField.value = x;
        yField.value = y;
        brightnessField.value = colorData;
    });
    if (typeof zoom != 'undefined') zoom.remove()
    zoom = document.createElement("canvas");
    zoom.width = pictureParams[0];
    zoom.height = pictureParams[0];
    zoom.style.overflowY = "scroll";
    zoomCtx = zoom.getContext("2d");
    zoomContainer.appendChild(zoom);
    if (typeof overview != 'undefined') overview.remove()
    overview = document.createElement("canvas");
    sizeModifier = overviewContainer.offsetHeight/pictureParams[1]
    overview.width = parseInt(pictureParams[0]*sizeModifier);
    overview.height = overviewContainer.offsetHeight;
    overviewCtx = overview.getContext("2d");
    overviewContainer.appendChild(overview);
    displayPicture();
    addZoomBounds();
}

offset.onchange = () => {
    displayPicture();
}

const bilinearyInterpolate = (left, top, size, zoomLevel, data) => {
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    const interpolationUnitSize = 2*zoomLevel-1 // размер фрагмента 2х2 пиксела после интерполяции
    const zoomedSize = (interpolationUnitSize-1)*(size-1)+1
    const zoomedData = []
    for (let j = 0; j < zoomedSize; j++){
        zoomedData.push([])
    }
    let rowIndex = 0
    for (let i = top; i < top+size-1; i++){
        let columnIndex = 0
        for (let j = left; j < left+size-1; j++){
            const Itl = data[i][j] // яркость верхней левой точки новой системы координат
            const Itr = data[i][j+1] // яркость верхней правой точки новой системы координат
            const Ibl = data[i+1][j] // яркость нижней левой точки новой системы координат
            const Ibr = data[i+1][j+1] // яркость нижней правой точки новой системы координат
            for (let n = rowIndex; n < rowIndex+interpolationUnitSize; n++){
                const y = n%interpolationUnitSize/interpolationUnitSize
                for (let m = columnIndex; m < columnIndex+interpolationUnitSize; m++){
                    const x = m%interpolationUnitSize/interpolationUnitSize
                    const brightness = Itl*(1-x)*(1-y)+Itr*(1-y)*x+Ibl*(1-x)*y+Ibr*x*y
                    zoomedData[n][m]=Math.round(brightness)
                }
            }
            columnIndex+=interpolationUnitSize-1
        }
        rowIndex+=interpolationUnitSize-1
    }
    return {zoomedData, zoomedSize}
}

const normalize = (data) => {
    maxBrightness = Math.max.apply(null, data.map((x)=>Math.max.apply(null, x)))
    minBrightness = Math.min.apply(null, data.map((x)=>Math.min.apply(null, x)))
    delta = maxBrightness - minBrightness
    normalizedUnit = delta/0xFF
    normalizedData = data.map((x)=>x.map((y)=>(y-minBrightness)*normalizedUnit))
    return normalizedData
}

const displayZoom = (event) => {
    const {zoomedData, zoomedSize} = bilinearyInterpolate(zoomAreaParams.left, zoomAreaParams.top, zoomAreaParams.size, zoomLevel, pictureData)
    const normalizedData = normalize(zoomedData)
    const finalData = applyOffset(normalizedData, offset.value)
    drawPicture(zoomCtx, zoomedSize, zoomedSize, finalData)
} 