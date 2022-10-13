"use strict";

class RGBModel {
    constructor(fromFun, toFun) {
        this.fromXYZ = fromFun // params: x,y,z (0-1); return: [r,g,b]  (0-1)
        this.toXYZ = toFun // params: r,g,b (0-1); return: [x,y,z]  (0-1)
    }
}

class Lch { // LCH_uv
    constructor(luma, chroma, hue) {
        this.l = luma // 0-100
        this.h = hue // 0-360
        this.c = chroma // 0-100
    }

    static xyzToLvu(rgbModel, X_, Y_, Z_) {
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

        console.log("rgb->xyz",x,y,z)
        console.log("rgb->xyz->luv",l,u,v)
        console.log("rgb->xyz->luv->lch",l,c,h)

        return new Lch(l, c, h)
    }

    toRGB(rgbModel) {
        let hrad = this.h * Math.PI / 180.0
        let u = this.c * Math.cos(hrad)
        let v = this.c * Math.sin(hrad)
        let [x, y, z] = Lch.lvuToXyz(rgbModel, this.l, u, v)
        let [r, g, b] = rgbModel.fromXYZ(x, y, z)

        console.log("lch", this.l, this.c, this.h)
        console.log("lch->luv", this.l, u, v)
        console.log("lch->luv->xyz", x, y, z)
        console.log("lch->luv->xyz->rgb", r, g, b)

        return [r, g, b]
    }
}

class Hsluv {
    // some snippets comes from https://github.com/hsluv/hsluv-javascript/blob/main/src/hsluv.ts
    construct(hue, saturation, light) {
        this.h = hue
        this.s = saturation
        this.l = light
    }

    static fromLch(lch) {
        if (lch.l > 99.9999999) {
            this.hsluv_s = 0;
            this.hsluv_l = 100;
        }
        else if (lch.l < 0.00000001) {
            this.hsluv_s = 0;
            this.hsluv_l = 0;
        }
        else {
            this.calculateBoundingLines(this.lch_l);
            const max = this.calcMaxChromaHsluv(this.lch_h);
            this.hsluv_s = this.lch_c / max * 100;
            this.hsluv_l = this.lch_l;
        }
        this.hsluv_h = this.lch_h;
    }
}

const acam = Object.freeze({


    fromLch(lch, variance) {
        let newL = l // TODO
        return new Lch(newL, c, h)
    }
})

function init() {

}

function updatePicker() {
    // console.log("mxy", cx, cy, "variance", variance, "chrominance", chrominance, rgbModel, eigencol, ambcol, outcol)

    let luma = cy / 299.0 * 100.0
    let selectedRgbModel = rgbModels[rgbModel]
    let eigen = Lch.fromRGB(selectedRgbModel, eigencol[0], eigencol[1], eigencol[2])
    // let eigen =
    eigen.l = luma

    outcol = eigen.toRGB(selectedRgbModel)
    let newCol = rgbTriadToStr(outcol)
    let outOfGamut = outcol.some(it=>it<0)

    console.log(eigen, outcol, newCol, `out of gamut: ${outOfGamut}`)

    setOutputSwatch(newCol, outOfGamut)
    setOutputCcode(newCol, outOfGamut)
}

