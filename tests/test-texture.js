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

import { Context, GLNAME, Shader, Program } from "../kangas.js/context.js"
import { Texture } from "../kangas.js/texture.js"

const canvas = document.getElementById('app-canvas');
const button = document.getElementById('fullscreen-button');
button.onclick = ()=>{canvas.requestFullscreen(canvas)};
const context = new Context(canvas, {alpha:true}, [Shader, Program, Texture]);
const gl = context[GLNAME];
const twopi = 2.0*Math.PI;
let program;
let galaxy = context.Texture.init(
	{ 
		src: "./galaxy-small.jpg", 
		options: {format:gl.RGB, width:512, heigh: 512} 
	}, initRendering );


function initRendering () {
	gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

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
	let prog = new context.Program(vShaderText, fShaderText);

	program=prog;
	gl.useProgram(program[GLNAME]);
	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
	gl.uniformMatrix4fv(program.MVPmatrix, false, mvMatrix);
	gl.uniform1f(program.freq, 8.0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, galaxy[GLNAME]);
	gl.uniform1i(program.galaxy, 0);

	window.requestAnimationFrame(animate);
}


function animate(timestamp) {
	//console.log(timestamp);
	gl.uniform1f(program.phase, -(timestamp/1000.0)%twopi);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	window.requestAnimationFrame(animate);
}


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
