

const srcImg = document.querySelector('#portrait'); 
srcImg.crossOrigin = "Anonymous";
const maxValue = 8;
const maxLineLength = 10;
let srcWidth;
let srcHeight;
let strokeOpacity = 0.5;
const scalingFactor = 4;
const normalize = false
const delayed = true

const canvas = document.querySelector('#main-canvas')

const delay = time => new Promise(res=>setTimeout(res,time));

document.querySelector('#methodswitch').addEventListener('change', (e) => {
    let mode = e.currentTarget.checked ? 'dots' : 'strokes'
    let densityArray = getImageDensity(srcImg, maxValue)
    drawImage(canvas, densityArray, mode , srcWidth, srcHeight, scalingFactor, maxValue, maxLineLength)
})

waitForImage()

function waitForImage() {
    if(srcImg.width == 0) {
        requestAnimationFrame(waitForImage)
    }else{
        srcWidth = srcImg.width
        srcHeight = srcImg.height
        setTimeout(() => {
            let densityArray = getImageDensity(srcImg, maxValue)
            drawImage(canvas, densityArray, 'strokes', srcWidth, srcHeight, scalingFactor, maxValue, maxLineLength)
        }, 200)

    }
}

function getImageDensity(img, maxValue) {
    const _canvas = document.createElement('canvas'); 
    const _ctx = _canvas.getContext('2d'); 
     
    _canvas.width = img.width; 
    _canvas.height = img.height; 
     
    _ctx.drawImage(img, 0, 0); 
     
    const rgba = _ctx.getImageData( 
      0, 0, img.width, img.height 
    ).data;
    
    let _densityArray = []
    let normalizationFactor = 1
    if(normalize) {
        let totalDensity = 0
        for(let i=0; i<rgba.length; i=i+4) {
            totalDensity += Math.round(getDensity(rgba[i],rgba[i+1],rgba[i+2], maxValue))
        }
    
        const targetAverage = (maxValue) / 2
        let averageDensity = totalDensity / (rgba.length / targetAverage)
        // clamp between 0.5 and 2
        normalizationFactor = Math.max(Math.min(targetAverage / averageDensity, 2), 0.5)
    }
    for(let i=0; i<rgba.length; i=i+4) {
        _densityArray.push(Math.min(maxValue,Math.round(normalizationFactor * getDensity(rgba[i],rgba[i+1],rgba[i+2], maxValue))))
    }

    return _densityArray
}

async function drawImage(canvas, density, method, width, height, scaling, maxValue, maxLineLength) {
    canvas.width = width * scaling + scaling * 2
    canvas.height = height * scaling + scaling * 2
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 1, -1)
    gradient.addColorStop(0, '#ccc')
    gradient.addColorStop(0.2, '#333')
    gradient.addColorStop(0.6, '#333')
    gradient.addColorStop(1, '#ccc')
    ctx.lineWidth = 1
    let numlines = 0
    // find first pixel w/ max value
    if(method == 'strokes') {
        ctx.strokeStyle = 'rgba(0,0,0,'+strokeOpacity+')'
        while(maxValue > 0) {
            for(let y=0; y<height; y++) {
                for(let x=0; x<width; x++) {
                    if(density[x+y*width] == maxValue) {
                        density[x+y*width]--
                        let lineLength = 1;
                        let lineLength2 = 0;
                        const fuzzyMax = fuzzy(maxLineLength, 0.5)
                        for(let offset = 1; offset <= Math.min(x, height-y); offset++) {
                            if(density[x-offset+(y+offset)*width] > Math.max(0,maxValue - 1)) {
                                density[x-offset+(y+offset)*width]--;
                                lineLength++;
                                if(lineLength >= fuzzyMax / 2)
                                    break;
                            } else {
                                break;
                            }
                        }
                        for(let offset = 1; offset <= Math.min(width-x, y); offset++) {
                            if(density[x+offset+(y-offset)*width] > Math.max(0,maxValue - 1)) {
                                density[x-offset+(y+offset)*width]--;
                                lineLength2++;
                                if(lineLength2 >= fuzzyMax / 2)
                                    break;
                            } else {
                                break;
                            }
                        }
                        const randomness = 1.0
                        xoff = 2 + (-0.5 + 1.0 * Math.random()) * randomness
                        yoff = 1 + (-0.5 + 1.0 * Math.random()) * randomness
                        rx1 = x + xoff + 0.1 * Math.random()
                        ry1 = y + yoff + 0.1 * Math.random()
                        rx2 = x + xoff + 0.1 * Math.random()
                        ry2 = y + yoff + 0.1 * Math.random()
                        drawLine(ctx, scaling*(rx1+lineLength2), scaling*(ry1-lineLength2), scaling*(rx2-lineLength), scaling*(ry2+lineLength))
                        numlines++
                        document.querySelector('#status3').innerHTML = numlines
                        if(delayed && numlines % 500 == 0)
                            await timeout(10)
                    }
                }
            }
            maxValue--;
        }
    } else if (method == 'dots') {
        ctx.fillStyle = 'rgba(0,0,0, 0.7)'
        while(maxValue > 0) {
            for(let y=0; y<height; y++) {
                for(let x=0; x<width; x++) {
                    if(density[x+y*width] == maxValue) {
                        density[x+y*width]--
                        numlines++
                        if(Math.random() < 0.0) continue
                        const randomness = 1.0
                        xoff = 2 + (-0.5 + 1.0 * Math.random()) * randomness
                        yoff = 1 + (-0.5 + 1.0 * Math.random()) * randomness
                        rx = x + xoff + 0.0 * Math.random()
                        ry = y + yoff + 0.0 * Math.random()
                        drawDot(ctx, scaling * rx, scaling * ry, 1.5)
                        document.querySelector('#status3').innerHTML = numlines
                        if(delayed && numlines % 1000 == 0)
                            await timeout(10)
                    }
                }
            }
            maxValue--;
        }
    }
    
}

function drawDot(ctx, x, y, r) {
    ctx.beginPath()
    ctx.moveTo(x-r, y)
    ctx.arc(x, y, r, 0, 2*Math.PI)
    ctx.fill()
    ctx.closePath()
    return
}

function drawLine(ctx, startX, startY, endX, endY) {
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    ctx.closePath()
    return;
}

function getDensity(r,g,b,maxValue) {
    return Math.round((255-(0.2126*r + 0.7152*g + 0.0722*b)) / (255/maxValue))
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fuzzy(num, range) {
    return num - range + Math.random() * 2 * range
}
