"use strict";

class Lch { // OKLCH
    l;c;h;
    constructor(luma, chroma, hue) {
        if ([luma,chroma,hue].some(it=>it===undefined)) throw Error()
        this.l = luma // 0-100
        this.h = hue // 0-360
        this.c = chroma // 0-100
    }

    static xyzToLab(rgbModel, X_, Y_, Z_) {
        if (Y_ === undefined || Z_ === undefined) throw Error("Illegal param")
        // FIXME D65 only!

        let l = Math.pow(0.8189330101*X_ + 0.3618667424*Y_ - 0.1288597137*Z_, 0.333333333333)
        let m = Math.pow(0.0329845436*X_ + 0.9293118715*Y_ + 0.0361456387*Z_, 0.333333333333)
        let s = Math.pow(0.0482003018*X_ + 0.2643662691*Y_ + 0.6338517070*Z_, 0.333333333333)

        let L = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s
        let a = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s
        let b = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s

        return [L, a, b]
    }

    static labToXyz(rgbModel, L, a, b) { // 0-1, -1-1, -1-1
        if (a === undefined || b === undefined) throw Error("Illegal param")
        if (L < 0.000001) return [0.0, 0.0, 0.0]
        // FIXME D65 only!

        let l = Math.pow(0.99999999845051981432*L + 0.39633779217376785678*a + 0.21580375806075880339*b, 3.0)
        let m = Math.pow(1.0000000088817607767*L - 0.1055613423236563494*a - 0.063854174771705903402*b, 3.0)
        let s = Math.pow(1.0000000546724109177*L - 0.089484182094965759684*a - 1.2914855378640917399*b, 3.0)

        let X = 1.227013851103521026*l - 0.5577999806518222383*m + 0.28125614896646780758*s
        let Y = -0.040580178423280593977*l + 1.1122568696168301049*m - 0.071676678665601200577*s
        let Z = -0.076381284505706892869*l - 0.42148197841801273055*m + 1.5861632204407947575*s

        return [X, Y, Z]
    }
    /**
     * @param rgbModel usually `rgbModels.sRGB` or something
     */
    static fromRGB(rgbModel, r, g, b) {
        let [x, y, z] = rgbModel.toXYZ(r, g, b)
        let [l, u, v] = Lch.xyzToLab(rgbModel, x, y, z)

        let c = Math.pow(u*u + v*v, 0.5)
        let h = Math.atan2(v,u) * 180.0 / Math.PI

        while (h < 0) h += 360.0

        // console.log("rgb->xyz",x,y,z)
        // console.log("rgb->xyz->luv",l,u,v)
        // console.log("rgb->xyz->luv->lch",l,c,h)

        return new Lch(l, c, h)
    }

    toRGB(rgbModel) {
        let hrad = this.h * Math.PI / 180.0
        let u = this.c * Math.cos(hrad)
        let v = this.c * Math.sin(hrad)
        let [x, y, z] = Lch.labToXyz(rgbModel, this.l, u, v)
        let [r, g, b] = rgbModel.fromXYZ(x, y, z)

        // console.log("hsl->lch", this.l, this.c, this.h)
        // console.log("hsl->lch->luv", this.l, u, v)
        // console.log("hsl->lch->luv->xyz", x, y, z)
        // console.log("hsl->lch->luv->xyz->rgb", r, g, b)

        return [r, g, b]
    }

    toLuv() {
        let hrad = this.h * Math.PI / 180.0
        let u = this.c * Math.cos(hrad)
        let v = this.c * Math.sin(hrad)
        return [this.l, u, v]
    }
}

class Hsl {
    h;s;l;
    // this "Hsl" is completely unrelated to the RGB-Based Hue-Saturation-Value, nor the Alexei Boronine's invention (https://www.hsl.org/)
    /*
     * Hue: CIELch_uv Hue
     * Saturation: CIELch_uv Chrominance that is subject to be adapted to the will-be-given lightness change
     * Lightness: CIELch_uv Lightness
     */
    constructor(hue, saturation, lightness) {
        if ([hue,saturation,lightness].some(it=>it===undefined)) throw Error()
        this.h = hue
        this.s = saturation
        this.l = lightness
    }

    static fromLch(lch) {
        return new Hsl(lch.h, lch.c, lch.l)
    }

    toLch() {
        return new Lch(this.l, this.s, this.h)
    }

    cpy() {
        return new Hsl(this.h, this.s, this.l)
    }
}

const ACAM = {}
ACAM.transformToHsl = function(hsl, variance, lightness) {
    if (lightness === undefined) throw Error()

    let oldh = hsl.h
    let q = 1.0 / (variance + 0.00001) // to avoid the division by zero
    let lightnessScale = 1.0 - Math.pow(1.0 - Math.pow(1.0 - lightness, q), 1.0 / q)

    let gravity = 120.0

    let h = oldh + gravity * lightnessScale * (flipChecked ? -1 : 1)

    return new Hsl(h, hsl.s, hsl.l)
}
ACAM.transformToLuv = function(hsl, variance, lightness) {
    let tcol = ACAM.transformToHsl(hsl, variance, lightness)
    return tcol.toLch().toLuv()
}
ACAM.transformToRGB = function(rgbModel, hsl, variance, lightness) {
    let tcol = ACAM.transformToHsl(hsl, variance, lightness)
    return tcol.toLch().toRGB(rgbModel)
}

function transformAmbMix(t) {
    return Math.asin(t) / (0.5 * Math.PI)
}

function transformAmbMix2(t) {
    return Math.sin(t * Math.PI * 0.5)
}

function updatePicker() {
    // console.log("mxy", cx, cy, "variance", variance, "ambmix", getCompanededAmbmix(), rgbModel, eigencol, ambcol, outcol)

    let selectedRgbModel = rgbModels[rgbModel]
    let eigenLCH = Lch.fromRGB(selectedRgbModel, eigencol[0], eigencol[1], eigencol[2])
    let eigen = Hsl.fromLch(eigenLCH)

    // console.log("let eigen =", eigen)

    _calculatedEigen = eigen.cpy()
    let lightnessScale = 1.0 - (cy / 299.0)
    let newLightness = eigen.l * lightnessScale
    let saturation = eigen.s * lightnessScale // uniform Saturation is obtained by transforming the Chroma with a proper function relative to the lightness
    let newEigen = new Hsl(eigen.h, saturation, newLightness)

    // console.log("newEigen", newEigen)

    let t = transformAmbMix(cx / 299.0) * ambmix
    outcol = lerpWithAmbLuv(selectedRgbModel, ACAM.transformToLuv(newEigen, variance, lightnessScale), t * lightnessScale)
    let newCol = rgbTriadToStr(outcol)
    let outOfGamut = outcol.some(it=>it < -0.001961)

    if (outOfGamut) {
        console.log("Out of gamut", outcol)
    }

    setOutputSwatch(newCol, outOfGamut)
    setOutputCcode(newCol, outOfGamut)
    document.getElementById("gradcursor").setAttribute("fill", rgbTriadToStr(outcol))
}

const blendfuns = { // returns [r,g,b]
    normal(rgbfuns, clLuv, crLuv, t) {
        let [ll, lu, lv] = [0,1,2].map(it=>lerp(clLuv[it], crLuv[it], t))
        let [lx, ly, lz] = Lch.labToXyz(rgbfuns, ll, lu, lv)
        return rgbfuns.fromXYZ(lx, ly, lz)
    },
    multiply(rgbfuns, clLuv, crLuv, t) {
        let [lx, ly, lz] = Lch.labToXyz(rgbfuns, clLuv[0], clLuv[1], clLuv[2])
        let lrgb = rgbfuns.fromXYZ(lx, ly, lz)

        let [rx, ry, rz] = Lch.labToXyz(rgbfuns, crLuv[0], crLuv[1], crLuv[2])
        let rrgb = rgbfuns.fromXYZ(rx, ry, rz)
        let lrrgb = [0,1,2].map(it=>lrgb[it]*rrgb[it])

        return [0,1,2].map(it=>lerp(lrgb[it], lrrgb[it], t))
    },
    screen(rgbfuns, clLuv, crLuv, t) {
        let [lx, ly, lz] = Lch.labToXyz(rgbfuns, clLuv[0], clLuv[1], clLuv[2])
        let lrgb = rgbfuns.fromXYZ(lx, ly, lz)

        let [rx, ry, rz] = Lch.labToXyz(rgbfuns, crLuv[0], crLuv[1], crLuv[2])
        let rrgb = rgbfuns.fromXYZ(rx, ry, rz)
        let lrrgb = [0,1,2].map(it=>1.0-(1.0-lrgb[it])*(1.0-rrgb[it]))

        return [0,1,2].map(it=>lerp(lrgb[it], lrrgb[it], t))
    },
}
const gradMap = [[]]

function lerp(X, Y, t) {
    return X*(1.0-t) + Y*t
}

function lerpWithAmbLuv(rgbfuns, clLuv, t) {
    let [crx, cry, crz] = rgbfuns.toXYZ(ambcol[0], ambcol[1], ambcol[2])
    let crLuv = Lch.xyzToLab(rgbfuns, crx, cry, crz)

    return blendfuns[ambBlend](rgbfuns, clLuv, crLuv, t)
}

function drawGradCursor(x, y) {
    let cursor = document.getElementById("gradcursor")

    let selectedLuminance = outcol[0] * 0.375 + outcol[1] * 0.5 + outcol[2] * 0.125
    if (selectedLuminance > 0.5)
        cursor.setAttribute("stroke", "#000000")
    else
        cursor.setAttribute("stroke", "#FFFFFF")

    cursor.setAttribute("fill", rgbTriadToStr(outcol))

    cursor.setAttribute("cx", x)
    cursor.setAttribute("cy", y)
}

const canvasColourSpace = {
    "sRGB": "srgb",
    "AppleP3": "display-p3",
    "AdobeRGB": "adobe-rgb" // currently unsupported!!
}

function updateGradview() {
    let ctx = document.getElementById("gradview").getContext("2d", { colorSpace: canvasColourSpace[rgbModel] });
    const xSteps = 3
    const ySteps = 15

    const xMaxSteps = 300 / xSteps
    const yMaxSteps = 300 / ySteps

    const rgbfuns = rgbModels[rgbModel]
    for (let y = 0; y <= yMaxSteps; y++) {
        gradMap[y] = []
        for (let x = 0; x <= xMaxSteps; x++) {
            let cl = _calculatedEigen.cpy()
            let lightnessScale = 1.0 - (y / yMaxSteps)
            cl.l *= lightnessScale
            cl.s *= lightnessScale // uniform Saturation is obtained by transforming the Chroma with a proper function relative to the lightness

            let t = (x / xMaxSteps) * ambmix
            gradMap[y][x] = lerpWithAmbLuv(rgbfuns, ACAM.transformToLuv(cl, variance, lightnessScale), t * lightnessScale)

            // actually lay down the gradient squares
            if (x > 0 && y > 0) {
                const fill1 = `rgb(
                    ${255.0 * gradMap[y-1][x-1][0]},
                    ${255.0 * gradMap[y-1][x-1][1]},
                    ${255.0 * gradMap[y-1][x-1][2]}
                )`
                const fill2 = `rgb(
                    ${255.0 * gradMap[y][x-1][0]},
                    ${255.0 * gradMap[y][x-1][1]},
                    ${255.0 * gradMap[y][x-1][2]}
                )`
                const x1 = transformAmbMix2((x-1) / xMaxSteps) * 300 - 1
                const y1 = (y-1)*ySteps
                const x2 = (transformAmbMix2(x / xMaxSteps) - transformAmbMix2((x-1) / xMaxSteps)) * 300 + 1
                const y2 = y*ySteps
                const vgrad = ctx.createLinearGradient(0,y1,0,y2)
                vgrad.addColorStop(0.0, fill1)
                vgrad.addColorStop(1.0, fill2)
                ctx.fillStyle = vgrad
                ctx.fillRect(x1,y1,x2,y2)
            }
        }
    }
}
