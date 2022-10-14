"use strict";

class Lch { // LCH_uv
    l;c;h;
    constructor(luma, chroma, hue) {
        if ([luma,chroma,hue].some(it=>it===undefined)) throw Error()
        this.l = luma // 0-100
        this.h = hue // 0-360
        this.c = chroma // 0-100
    }

    static xyzToLvu(rgbModel, X_, Y_, Z_) {
        if (Y_ === undefined || Z_ === undefined) throw Error("Illegal param")

        // http://www.brucelindbloom.com/index.html
        // Capital letters here have _ appended (e.g. X_, L_)
        let [X_r, Y_r, Z_r] = rgbModel.toXYZ(1.0, 1.0, 1.0)
        let yr = Y_ / Y_r
        let up = 4.0*X_ / (X_ + 15.0*Y_ + 3.0*Z_)
        let vp = 9.0*Y_ / (X_ + 15.0*Y_ + 3.0*Z_)
        let upr = 4.0*X_r / (X_r + 15.0*Y_r + 3.0*Z_r)
        let vpr = 9.0*Y_r / (X_r + 15.0*Y_r + 3.0*Z_r)

        let L_ = (yr > 216.0/24389.0) ? (116.0 * Math.pow(yr, 1.0/3.0) - 16.0) : (24389.0/27.0 * yr)
        let u = 13.0*L_ * (up - upr)
        let v = 13.0*L_ * (vp - vpr)
        return [L_, u, v] // 0-100, -100-100, -100-100
    }

    static lvuToXyz(rgbModel, L_, u, v) { // 0-100, -100-100, -100-100
        if (u === undefined || v === undefined) throw Error("Illegal param")

        if (L_ < 0.000001) return [0.0, 0.0, 0.0]

        // http://www.brucelindbloom.com/index.html
        // Capital letters here have _ appended (e.g. X_, L_)
        let [X_r, Y_r, Z_r] = rgbModel.toXYZ(1.0, 1.0, 1.0)
        let upr = 4.0*X_r / (X_r + 15.0*Y_r + 3.0*Z_r)
        let vpr = 9.0*Y_r / (X_r + 15.0*Y_r + 3.0*Z_r)
        let Y_ = (L_ > 8.0) ? Math.pow((L_+16.0) / 116.0, 3.0) : L_ * 27.0 / 24389.0
        let a = (1.0/3.0)*((52.0*L_ / (u + 13.0*L_*upr)) - 1.0)
        let b = -5.0 * Y_
        let c = -1.0 / 3.0
        let d = Y_ * ((39.0*L_ / (v + 13.0*L_*vpr)) - 5.0)
        let X_ = (d - b) / (a - c)
        let Z_ = X_ * a + b
        return [X_, Y_, Z_]
    }
    /**
     * @param rgbModel usually `rgbModels.sRGB` or something
     */
    static fromRGB(rgbModel, r, g, b) {
        let [x, y, z] = rgbModel.toXYZ(r, g, b)
        let [l, u, v] = Lch.xyzToLvu(rgbModel, x, y, z)

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
        let [x, y, z] = Lch.lvuToXyz(rgbModel, this.l, u, v)
        let [r, g, b] = rgbModel.fromXYZ(x, y, z)

        // console.log("hsluv->lch", this.l, this.c, this.h)
        // console.log("hsluv->lch->luv", this.l, u, v)
        // console.log("hsluv->lch->luv->xyz", x, y, z)
        // console.log("hsluv->lch->luv->xyz->rgb", r, g, b)

        return [r, g, b]
    }

    toLuv() {
        let hrad = this.h * Math.PI / 180.0
        let u = this.c * Math.cos(hrad)
        let v = this.c * Math.sin(hrad)
        return [this.l, u, v]
    }
}

class Hsluv {
    h;s;l;
    // some snippets comes from https://github.com/hsluv/hsluv-javascript/blob/main/src/hsluv.ts
    constructor(hue, saturation, light) {
        if ([hue,saturation,light].some(it=>it===undefined)) throw Error()
        this.h = hue
        this.s = saturation
        this.l = light
    }

    static fromLch(lch) {
        let h = lch.h;
        let s = 0.0;
        let l = 0.0;

        if (lch.l > 99.9999999) {
            s = 0.0;
            l = 100.0;
        }
        else if (lch.l < 0.00000001) {
            s = 0.0;
            l = 0.0;
        }
        else {
            hsluv.calculateBoundingLines(lch.l);
            const max = hsluv.calcMaxChromaHsluv(lch.h);
            s = lch.c / max * 100.0;
            l = lch.l;
        }

        // console.log("rgb->xyz->luv->lch->hsluv", h, s, l)

        return new Hsluv(h, s, l)
    }

    toLch() {
        let l = 0.0;
        let c = 0.0;
        let h = this.h;
        if (this.l > 99.9999999) {
            l = 100.0;
            c = 0.0;
        }
        else if (this.l < 0.00000001) {
           l = 0.0;
           c = 0.0;
        }
        else {
            l = this.l;
            hsluv.calculateBoundingLines(this.l);
            const max = hsluv.calcMaxChromaHsluv(this.h);
            c = max / 100.0 * this.s;
        }

        // console.log("hsluv", this.h, this.s, this.l)

        return new Lch(l, c, h)
    }

    cpy() {
        return new Hsluv(this.h, this.s, this.l)
    }
}

const ACAM = {}
ACAM.transformToHsluv = function(hsluv, variance, relativeLuma) {
    if (relativeLuma === undefined) throw Error()

    let oldh = hsluv.h
    let h = oldh + (variance * 120) * Math.pow(1.0 - relativeLuma, 2.0) // TODO this is just there to show the colour selection is funneled thru this function

    // TODO
    // figure out the exact value of "(variance * 120)"
    // and then the multiplier will be something like "Math.pow(1.0 - relativeLuma, 1.0 + Math.abs(variance))"

    return new Hsluv(h, hsluv.s, hsluv.l)
}
ACAM.transformToLuv = function(hsluv, variance, relativeLuma) {
    let tcol = ACAM.transformToHsluv(hsluv, variance, relativeLuma)
    return tcol.toLch().toLuv()
}
ACAM.transformToRGB = function(rgbModel, hsluv, variance, relativeLuma) {
    let tcol = ACAM.transformToHsluv(hsluv, variance, relativeLuma)
    return tcol.toLch().toRGB(rgbModel)
}

function getCompanededAmbmix() {
    return transformAmbMix(ambmix)
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
    let eigen = Hsluv.fromLch(eigenLCH)

    // console.log("let eigen =", eigen)

    _calculatedEigen = eigen.cpy()
    let lumaScale = 1.0 - (cy / 299.0)
    let luma = eigen.l * lumaScale
    let newEigen = new Hsluv(eigen.h, eigen.s, luma)

    // console.log("newEigen", newEigen)

    let t = transformAmbMix(cx / 299.0) * getCompanededAmbmix()
    outcol = lerpWithAmbLuv(selectedRgbModel, ACAM.transformToLuv(newEigen, variance, lumaScale), t * lumaScale)
    let newCol = rgbTriadToStr(outcol)
    let outOfGamut = outcol.some(it=>it < -0.00002)

    setOutputSwatch(newCol, outOfGamut)
    setOutputCcode(newCol, outOfGamut)
    document.getElementById("gradcursor").setAttribute("fill", rgbTriadToStr(outcol))
}

const gradMap = [[]]

function lerp(X, Y, t) {
    return X*(1.0-t) + Y*t
}

function lerpWithAmbLuv(rgbfuns, clLuv, t) {

    let [crx, cry, crz] = rgbfuns.toXYZ(ambcol[0], ambcol[1], ambcol[2])
    let crLuv = Lch.xyzToLvu(rgbfuns, crx, cry, crz)

    let [ll, lu, lv] = [0,1,2].map(it=>lerp(clLuv[it], crLuv[it], t)) // in Luv
    let [lx, ly, lz] = Lch.lvuToXyz(rgbfuns, ll, lu, lv)
    return rgbfuns.fromXYZ(lx, ly, lz)
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

function updateGradview() {
    let ctx = document.getElementById("gradview").getContext("2d");
    const xSteps = 3
    const ySteps = 15

    const xMaxSteps = 300 / xSteps
    const yMaxSteps = 300 / ySteps

    const rgbfuns = rgbModels[rgbModel]
    for (let y = 0; y <= yMaxSteps; y++) {
        gradMap[y] = []
        for (let x = 0; x <= xMaxSteps; x++) {
            let cl = _calculatedEigen.cpy()
            let lumaScale = 1.0 - (y / yMaxSteps)
            cl.l *= lumaScale

            let t = (x / xMaxSteps) * getCompanededAmbmix()
            // let t = transformAmbMix(x / maxSteps)
            gradMap[y][x] = lerpWithAmbLuv(rgbfuns, ACAM.transformToLuv(cl, variance, lumaScale), t * lumaScale)

            // actually lay down the gradient squares
            if (x > 0 && y > 0) {
                /*ctx.fillStyle = `rgb(
                    ${255.0 * gradMap[y-1][x-1][0]},
                    ${255.0 * gradMap[y-1][x-1][1]},
                    ${255.0 * gradMap[y-1][x-1][2]}
                )`*/
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
