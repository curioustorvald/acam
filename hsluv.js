/**
 * Code from https://github.com/hsluv/hsluv-javascript/blob/main/src/hsluv.ts
 *
 * Copyright (c) 2012-2022 Alexei Boronine
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use strict";

const hsluv = {
    kappa: 903.2962962,
    epsilon: 0.0088564516,

    m_r0: 3.240969941904521,
    m_r1: -1.537383177570093,
    m_r2: -0.498610760293,
    m_g0: -0.96924363628087,
    m_g1: 1.87596750150772,
    m_g2: 0.041555057407175,
    m_b0: 0.055630079696993,
    m_b1: -0.20397695888897,
    m_b2: 1.056971514242878,

    r0s: 0.0,
    r0i: 0.0,
    r1s: 0.0,
    r1i: 0.0,
    g0s: 0.0,
    g0i: 0.0,
    g1s: 0.0,
    g1i: 0.0,
    b0s: 0.0,
    b0i: 0.0,
    b1s: 0.0,
    b1i: 0.0,

    distanceFromOriginAngle(slope, intercept, angle) {
        const d = intercept / (Math.sin(angle) - slope * Math.cos(angle));
        if (d < 0) {
            return Infinity;
        } else {
            return d;
        }
    },

    min6(f1, f2, f3, f4, f5, f6) {
        return Math.min(f1, Math.min(f2, Math.min(f3, Math.min(f4, Math.min(f5, f6)))));
    },

    calculateBoundingLines(l) {
        const sub1 = Math.pow(l + 16, 3) / 1560896;
        const sub2 = sub1 > this.epsilon ? sub1 : l / this.kappa;
        const s1r = sub2 * (284517 * this.m_r0 - 94839 * this.m_r2);
        const s2r = sub2 * (838422 * this.m_r2 + 769860 * this.m_r1 + 731718 * this.m_r0);
        const s3r = sub2 * (632260 * this.m_r2 - 126452 * this.m_r1);
        const s1g = sub2 * (284517 * this.m_g0 - 94839 * this.m_g2);
        const s2g = sub2 * (838422 * this.m_g2 + 769860 * this.m_g1 + 731718 * this.m_g0);
        const s3g = sub2 * (632260 * this.m_g2 - 126452 * this.m_g1);
        const s1b = sub2 * (284517 * this.m_b0 - 94839 * this.m_b2);
        const s2b = sub2 * (838422 * this.m_b2 + 769860 * this.m_b1 + 731718 * this.m_b0);
        const s3b = sub2 * (632260 * this.m_b2 - 126452 * this.m_b1);
        this.r0s = s1r / s3r;
        this.r0i = s2r * l / s3r;
        this.r1s = s1r / (s3r + 126452);
        this.r1i = (s2r - 769860) * l / (s3r + 126452);
        this.g0s = s1g / s3g;
        this.g0i = s2g * l / s3g;
        this.g1s = s1g / (s3g + 126452);
        this.g1i = (s2g - 769860) * l / (s3g + 126452);
        this.b0s = s1b / s3b;
        this.b0i = s2b * l / s3b;
        this.b1s = s1b / (s3b + 126452);
        this.b1i = (s2b - 769860) * l / (s3b + 126452);
    },

    calcMaxChromaHsluv(h){
        const hueRad = h / 180.0 * Math.PI;
        const r0 = this.distanceFromOriginAngle(this.r0s, this.r0i, hueRad);
        const r1 = this.distanceFromOriginAngle(this.r1s, this.r1i, hueRad);
        const g0 = this.distanceFromOriginAngle(this.g0s, this.g0i, hueRad);
        const g1 = this.distanceFromOriginAngle(this.g1s, this.g1i, hueRad);
        const b0 = this.distanceFromOriginAngle(this.b0s, this.b0i, hueRad);
        const b1 = this.distanceFromOriginAngle(this.b1s, this.b1i, hueRad);
        return this.min6(r0, r1, g0, g1, b0, b1);
    }
}
