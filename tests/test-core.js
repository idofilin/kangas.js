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

import { GLNAME, Context as CoreContext, Shader, Program } from "../kangas.js/core.js"

console.log(CoreContext.name)

let canvas = document.getElementById('app-canvas');
let context = new CoreContext(canvas, {alpha:true}, [Shader,Program]);
let gl = context[GLNAME];

console.log(canvas);
console.log(context);


gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
gl.frontFace(gl.CCW);
gl.enable(gl.CULL_FACE);
gl.depthFunc(gl.LEQUAL);
gl.blendFunc(gl.ONE_MINUS_DST_ALPHA,gl.DST_ALPHA);
gl.clearColor(0.0, 0.0, 1.0, 1.0);
gl.clearDepth(1.0);
gl.enable(gl.DEPTH_TEST);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.flush();

const vertices=new Float32Array([
				 -1.0, -1.0, 0.0, 0.0,
				  1.0, -1.0, 1.0, 0.0,
				  1.0, 1.0, 1.0, 1.0,
				 -1.0, 1.0, 0.0, 1.0,
				]);

const indices = new Uint16Array([
			0, 1, 2, 0, 2, 3,
		]);

let vertexBuffer = gl.createBuffer();	
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

let indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const mvMatrix = new Float32Array([ 
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0,
	]);

const vShaderText = getvShaderText();
const fShaderText = getfShaderText();
let vsh = new context.Shader("vertex", vShaderText);
let fsh = new context.Shader("fragment", fShaderText);
let prog = new context.Program(vsh, fsh);
let prog2 = new context.Program(vShaderText, fShaderText);

console.log(vsh);
console.log(fsh);
console.log(prog);
console.log(prog2);

let program=prog;
gl.useProgram(program[GLNAME]);
gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
gl.uniformMatrix4fv(program.MVPmatrix, false, mvMatrix);
gl.uniform1f(program.freq, 48.0);

const twopi = 2.0*Math.PI;

function animate(timestamp) {
	//console.log(timestamp);
	gl.uniform1f(program.phase, -(timestamp/250.0)%twopi);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	window.requestAnimationFrame(animate);
}

window.requestAnimationFrame(animate);

function getvShaderText() {
	return `
precision highp float;
#define PI 3.141592653589793238462643383279502884

in vec4 coord;

out vec2 textureCoord;
out vec4 spaceCoord;

uniform mat4 MVPmatrix;

void main()
{
	gl_Position =  spaceCoord = MVPmatrix * vec4(coord.xy, 0.0, 1.0);
	textureCoord = coord.zw;     
}
`
}

function getfShaderText() {
	return `
precision mediump float;

#define PI 3.141592653589793238462643383279502884

vec2 rotate2d( in vec2 vector, 
		in vec2 center, 
		in float angle) {
	mat2 rotMat = mat2(cos(angle), sin(angle), 
		-sin(angle), cos(angle));
	vec2 displacement = vector - center;
	vec2 rotatedDisplacement = rotMat*displacement;
	return rotatedDisplacement + center;
}

vec4 noise2d(in sampler2D texObj, in vec2 coord) {
	return texture( texObj, coord );
}

const vec3 yuvMetric = vec3(1.0, 0.436, 0.615);

const mat3 RGB2YUV = 
	mat3 (
	1.0 , 0.0, 0.0,
	0.0, 1.0/yuvMetric[1], 0.0,
	0.0, 0.0, 1.0/yuvMetric[2] ) 
	* mat3 (
	0.299, -0.14713, 0.615, 
	0.587, -0.28886, -0.51499, 
	0.114, 0.436, -0.10001 );

const mat3 YUV2RGB = 
	mat3 (
	1.0, 1.0, 1.0, 
	0.0, -0.39465, 2.03211, 
	1.13983, -0.58060, 0.0 )
	* mat3 (
	1.0 , 0.0, 0.0,
	0.0, yuvMetric[1], 0.0,
	0.0, 0.0, yuvMetric[2] );

const mat3 yuvCoeffs = mat3(
	RGB2YUV[0][0], RGB2YUV[1][0], RGB2YUV[2][0],
	RGB2YUV[0][1], RGB2YUV[1][1], RGB2YUV[2][1],
	RGB2YUV[0][2], RGB2YUV[1][2], RGB2YUV[2][2]);

in vec2 textureCoord;
out vec4 fraigment_color;
uniform float phase;
uniform float freq;

void main(void)
{
	fraigment_color = vec4(textureCoord, sin(freq*PI*textureCoord.s*textureCoord.t + phase), 1.0);
}
`
}
