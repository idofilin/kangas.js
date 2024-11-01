/*
Copyright 2016-2024 Ido Filin 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const twopi = Math.PI * 2.0;
const deg2rad = Math.PI / 180.0;
const sizeof = {};
Object.defineProperties ( sizeof, {
	float32:{
		value: Float32Array.BYTES_PER_ELEMENT,
		writable: false,
		enumurable: true,
		configurable: false,
	},
	uint16:{
		value: Uint16Array.BYTES_PER_ELEMENT,
		writable: false,
		enumurable: true,
		configurable: false,
	},
	uint32:{
		value: Uint32Array.BYTES_PER_ELEMENT,
		writable: false,
		enumurable: true,
		configurable: false,
	},
});

function rampPerspective (observerHeight, hnear, aspect, znear, zfar, horizon) {
	/* This function calculates projection matrices based on
	 * slanting the x-z plane (hereafter, ground) in the
	 * y-direction, creating a ramp.  The ramp is set such that
	 * the horizon (i.e., the line of intersection between the
	 * ground ramp and the zfar plane of the perspective frustum)
	 * is set by the horizon parameter (a value between
	 * -1 and 1 that determines the vertical position of the
	 *  horizon in viewport/screen coordinates); and  by the sum
	 *  of the vertical size of the frustum (hnear) and observer
	 *  height above the scene (observer height of 0 means
	 *  observer is on the ground). Thus, ... */

	/* Entire scene is vertically translated downward. */
	const verticalDisplacement = hnear + observerHeight

	/* Horizon parameter is translated to a range between 0 and 1.*/
	const hfraction = 0.5 - 0.5*horizon;

	/* Calculate the frustum. */
	const zdiff = zfar - znear;
	const xrange = hnear / 2.0 / aspect; 
	const sceneFrustum = 
			frustum(
				-xrange, xrange, 
				-hnear, 0.0, 
				-znear, -zfar)

	/* Add a ramp to output y-coordinate of frustum
	 * transformation, by adding terms to matrix elements:
	 * Element 5 is the scaling of y-coordinate, such that points
	 * inside the frustum get y-values between -1 and 1 after
	 * transformation; Element 9 is the shearing of y according
	 * to z, to which we add the slope of the ramp; Element 13 is
	 * the translation of y, to which we add the vertical
	 * translation of the entire scene (Note that element 13 of
	 * the original frustum is in fact 0, so we can just
	 * overwrite it). */
	const hdiff = verticalDisplacement  -  hnear*zfar/znear*hfraction;
	const hramp = hdiff/zdiff;;
	let projection = Float32Array.from(sceneFrustum);
	projection[9] += hramp * sceneFrustum[5];
	projection[13] = (hramp*(-znear) - verticalDisplacement) * sceneFrustum[5];

	/* The following matrix is for off-screen rendering/texturing
	 * the ground and pre-calculating ground depth buffer for
	 * blending ground and other scene elements. The ground fills
	 * the entire framebuffer in this off-screen rendering, so
	 * different ramp and frustum are required. */
	/* zstar is the z-coordinate of the first appearance of the
	 * ground surface in the scene, i.e., where the ground ramp
	 * intersects the view frustum. The transformation matrix
	 * would transform points on the ground located at zstar to
	 * the bottom horizontal edge of the scene. Similarly, there
	 * is no horizon (i.e., horizon is set to 1) in off-screen
	 * rendering of ground, so points at zfar would be
	 * transformed to the upper edge.*/
	/* zoom (=== zstar/znear) is just a helper variable that
	 * captures the zooming effect of the off-screen frustum,
	 * where znear is replaced by zstar.*/
	const zoom = 1.0 + observerHeight/(hnear + hramp*znear);
	const zstar = znear*zoom;
	let groundProjection = Float32Array.from(sceneFrustum);
	//groundProjection[10] *= (zfar+zstar) / (zfar+znear*(1 + zoom*sceneFrustum[10] - sceneFrustum[10]));
	groundProjection[10] = -(zfar + zstar) / (zfar - zstar);
	groundProjection[14] = 2*zfar*zstar / (zfar - zstar);
	const groundHramp = (hnear*zoom)/(zfar - zstar);
	groundProjection[9] += groundHramp * sceneFrustum[5]; 
	groundProjection[13] = (groundHramp*(-zstar) - hnear*zoom) * sceneFrustum[5];

	/* The depth value of points at zstar in the main scene (by
	 * definition, it is -1.0 for off-screen rendering). This
	 * allows scaling of depth values from ground texture, so to
	 * be compared with depth of other scene items. */
	const depthStar = (sceneFrustum[10]*(zstar) + sceneFrustum[14]) / (sceneFrustum[11]*zstar); 

	return { 
		projection : projection,
		groundProjection : groundProjection, 
		constants : {
			zstar: zstar, 
			depthstar: depthStar, 
			zoom: zoom, 
			hramp: hramp, 
			znear: znear, 
			zfar: zfar, 
			hnear: hnear, 
			hobserver: observerHeight,
			horizon: horizon,
		},
	};
};

function frustum (xmin, xmax, ymin, ymax, znear, zfar) {
	const xdiff = xmax - xmin,
	ydiff = ymax - ymin,
	zdiff = zfar - znear;

	let P = new Float32Array(16);
	P[0] = (znear * 2) / xdiff;
	P[5] = (znear * 2) / ydiff;
	P[8] = (xmin + xmax) / xdiff;
	P[9] = (ymin + ymax) / ydiff;
	P[10] = -(zfar + znear) / zdiff;
	P[11] = -1.0;
	P[14] = -(zfar * znear * 2) / zdiff;
	return P;
}

function perspective (xrange, yrange, znear, zfar) {
	return frustum (
			-xrange, xrange, -yrange, yrange, -znear, -zfar);
}

const identityArray = [
			1.0, 0.0, 0.0, 0.0,
			0.0, 1.0, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0,
		];
function identity () { return Float32Array.from(identityArray) }

const reverseHandArray = [
			1.0, 0.0, 0.0, 0.0,
			0.0, 1.0, 0.0, 0.0,
			0.0, 0.0, -1.0, 0.0,
			0.0, 0.0, 0.0, 1.0,
		];
function reverseHandedness () { return Float32Array.from(reverseHandArray) } 

function translation (delta) {
	let P = identity();
	P.set(delta,12);
	return P;
}

function translationYawPitchRoll (delta, angles) {
	/* Values in parameter angles are provided according to axis of 
	 * rotation, NOT order of rotation! E.g., pitch is the second
	 * rotation angle, but is provided as angles[0], because it
	 * describes rotation around the x-axis. */

	let P = new Float32Array(16);
	const Q = mat3YawPitchRoll(angles);
    P.set(Q.subarray(0,3),0);
    P.set(Q.subarray(3,6),4);
    P.set(Q.subarray(6),8);
    P[12] = P[0]*delta[0] + P[4]*delta[1] + P[8]*delta[2];
    P[13] = P[1]*delta[0] + P[5]*delta[1] + P[9]*delta[2];
    P[14] = P[2]*delta[0] + P[6]*delta[1] + P[10]*delta[2]; 
    P[15] = 1.0;
	return P;
}

function mat3YawPitchRoll (angles) {
	const [ sPitch, sYaw, sRoll ] = Array.from(angles, Math.sin),
	      [ cPitch, cYaw, cRoll ] = Array.from(angles, Math.cos);

	let P = new Float32Array(9);
    P[0] = cRoll*cYaw - sRoll*sPitch*sYaw;
    P[1] = sRoll*cYaw + cRoll*sPitch*sYaw;
    P[2] = -cPitch*sYaw;
    P[3] = -sRoll*cPitch;
    P[4] = cRoll*cPitch;
    P[5] = sPitch;
    P[6] = cRoll*sYaw + sRoll*sPitch*cYaw;
    P[7] = sRoll*sYaw - cRoll*sPitch*cYaw;
    P[8] = cPitch*cYaw;
	return P;
}

function matProd (A, ...restargs) {
	const B = (restargs.length === 1)? restargs[0]
			: matProd(...restargs);
	const dim = (A.length === 16) ?  4 :
		(A.length === 9) ? 3 : 
		(A.length === 4) ? 2 : 1;
	let P = new Float32Array(dim*dim);
	for (let col = 0; col < dim; col++)
	for (let row = 0; row < dim; row++) {
		const index = col*dim+row;
		P[index] = 0;
		for (let i = 0; i < dim; i++) {
			P[index] += A[i*dim+row]*B[col*dim+i];
		}
	}
	return P;
}

function rotateVector (vec, axis, angle) {
	const [ u, v, w ] = axis,
		[ x, y, z ] = vec;

    const dotprod = u*x + y*v + w*z,
	    cosang = Math.cos(angle),
		sinang = Math.sin(angle);
	const oneminuscos = 1.0 - cosang;

	let P = new Float32Array(3);
	P[0] = u*dotprod*oneminuscos + x*cosang + (v*z - w*y)*sinang;
	P[1] = v*dotprod*oneminuscos + y*cosang + (w*x - u*z)*sinang;
	P[2] = w*dotprod*oneminuscos + z*cosang + (u*y - v*x)*sinang;
	return P;
}

function vecInterp(lowvec, hivec, factor) {
	const lo = [...lowvec];
	const hi = [...hivec];
	return lo.map(function(x,i){return x*(1-factor)+hi[i]*factor;});
}

export { 
	twopi, deg2rad, sizeof,
	rampPerspective, 
	frustum, 
	perspective, 
	identity, 
	reverseHandedness, 
	translation, 
	translationYawPitchRoll, 
	mat3YawPitchRoll, 
	matProd, 
	rotateVector, 
	vecInterp,
}
