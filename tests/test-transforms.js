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

import { Context, GLNAME, Shader, Program } from "../kangas.js/core.js"
import { Texture } from "../kangas.js/texture.js"
import * as Transform from "../kangas.js/transforms.js"

//console.log(Transform);

const canvas = document.getElementById('app-canvas');
const button = document.getElementById('fullscreen-button');
button.onclick = ()=>{canvas.requestFullscreen(canvas)};
const context = new Context(canvas, {alpha:true}, [Shader, Program, Texture]);
const gl = context[GLNAME];
const twopi = Transform.twopi;
const sizeof = Transform.sizeof;

gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
gl.frontFace(gl.CCW);
gl.enable(gl.CULL_FACE);
gl.depthFunc(gl.LEQUAL);
gl.blendFunc(gl.ONE_MINUS_DST_ALPHA,gl.DST_ALPHA);
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.flush();

let program;
let galaxy = context.Texture.init(
	{ 
		src: "./galaxy-small.jpg", 
		options: {format:gl.RGB, width:512, heigh: 512} 
	}, initRendering );

function initRendering () {

	const vShaderText = getvShaderText();
	const fShaderText = getfShaderText();
	let prog = new context.Program(vShaderText, fShaderText);
	console.log(prog);

	const onethird = 1.0/3.0,
		twothirds = 2.0/3.0;

	const vertices=new Float32Array([
		-1.0, -1.0, -1.0, 0.0, onethird,
		-1.0, +1.0, -1.0, 0.0, twothirds,
		-1.0, -1.0, -1.0, 0.25, 0.0,
		-1.0, -1.0, +1.0, 0.25, onethird,
		-1.0, +1.0, +1.0, 0.25, twothirds,
		-1.0, +1.0, -1.0, 0.25, 1.0,
		+1.0, -1.0, -1.0, 0.5, 0.0,
		+1.0, -1.0, +1.0, 0.5, onethird,
		+1.0, +1.0, +1.0, 0.5, twothirds,
		+1.0, +1.0, -1.0, 0.5, 1.0,
		+1.0, -1.0, -1.0, 0.75, onethird,
		+1.0, +1.0, -1.0, 0.75, twothirds,
		-1.0, -1.0, -1.0, 1.0, onethird,
		-1.0, +1.0, -1.0, 1.0, twothirds,
	]);

	const indices = new Uint16Array([
		0, 3, 4,
		0, 4, 1,
		2, 6, 7,
		2, 7, 3,
		3, 7, 8,
		3, 8, 4,
		4, 8, 9,
		4, 9, 5,
		7, 10, 11,
		7, 11, 8,
		10, 12, 13,
		10, 13, 11
	]);

	let vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	let indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	program=prog;
	gl.useProgram(program[GLNAME]);
	gl.vertexAttribPointer(program.posCoord, 3, gl.FLOAT, false, 5*Transform.sizeof.float32, 0);
	gl.vertexAttribPointer(program.texCoord, 2, gl.FLOAT, false, 5*sizeof.float32, 3*sizeof.float32);
	gl.uniform1f(program.freq, 8.0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, galaxy[GLNAME]);
	gl.uniform1i(program.galaxy, 0);

	window.requestAnimationFrame(animate);
}

const xmax = 0.5, 
		ymax = 0.5,
		znear = -1.0,
		zfar = -6.0;
const projMat = Transform.perspective(xmax, ymax, znear, zfar);
const transMat = Transform.translation([0.0, 0.0, -3.5]);
const ptMat = Transform.matProd(projMat, transMat);

function animate(timestamp) {
	//console.log(timestamp);

	const rotMat = Transform.translationYawPitchRoll( 
		[0.0, 0.0, 0.0], 
		[0.0001*Math.PI*timestamp, 0.0001*Math.E*timestamp, 0.0001*Math.SQRT2*timestamp] );
	//const mvpMat = Transform.matProd(projMat, transMat, rotMat);
	const mvpMat = Transform.matProd(ptMat, rotMat);
	gl.uniformMatrix4fv(program.MVPmatrix, false, mvpMat);

	gl.uniform1f(program.phase, -(timestamp/1000.0)%twopi);

	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
	window.requestAnimationFrame(animate);
}

function getvShaderText() {
	return `
precision highp float;
#define PI 3.141592653589793238462643383279502884

in vec3 posCoord;
in vec2 texCoord;

out vec4 spaceCoord;
out vec2 textureCoord;

uniform mat4 MVPmatrix;

void main()
{
	gl_Position =  spaceCoord = MVPmatrix * vec4(posCoord, 1.0);
	textureCoord = texCoord;     
}
`
}

function getfShaderText() {
	return `
precision highp float;
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


in vec2 textureCoord;
out vec4 fragment_color;
uniform float phase;
uniform float freq;
uniform sampler2D galaxy;
const vec2 texcenter = vec2(0.5,0.5);

const vec2 center = vec2(0.5,0.5);

void main(void)
{
	vec3 texcolor = texture(galaxy, rotate2d(textureCoord, texcenter, -phase)).rgb;
	fragment_color = 0.9*vec4(texcolor,1.0) + 0.3*vec4(textureCoord.s, sin(freq*PI*distance(textureCoord,center) + freq*phase), textureCoord.t, 1.0);
}
`
}
