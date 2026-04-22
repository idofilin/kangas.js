/*
Copyright (C) 2016–2026 Ido Filin. 

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

import { GLNAME } from "./core.js"
import { Texture } from "./texture.js"

Texture.prototype.fractal = 
		function generateFractalTexture (options, sources=null) {
	const basisTex = this,
			context = basisTex.context,
			gl = context[GLNAME];
	const texopts = textureOptions(context, options);

	const nPixelsX = texopts.width = 
		(options && options.width) 
		|| basisTex.pixelSize && basisTex.pixelSize[0] 
		|| texopts.width 
	const nPixelsY = texopts.height = 
		(options && options.height) 
		|| basisTex.pixelSize && basisTex.pixelSize[1] 
		|| texopts.height;
	
	const simpleSquareAttribs = [
	     -1.0,  -1.0, 0.0, 0.0,
	      1.0,  -1.0, 1.0, 0.0, 
	      1.0,   1.0, 1.0, 1.0, 
	     -1.0,   1.0, 0.0, 1.0, 
	];

	const simpleSquareIndices = [
		0 , 1, 2, 0, 2, 3,
	];

	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);

	const simpleSquareVertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,simpleSquareVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
		new Float32Array(simpleSquareAttribs), 
		gl.STATIC_DRAW);
	const simpleSquareIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simpleSquareIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(simpleSquareIndices), gl.STATIC_DRAW);

	const fbo = gl.createFramebuffer();
	fbo.width = nPixelsX;
	fbo.height = nPixelsY;
	const fractalTex = new context.Texture(fbo, texopts);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clear(gl.COLOR_BUFFER_BIT);

	let vshSrc, fshSrc; 
	if (!sources) {
		vshSrc=vShaderSrc();
		fshSrc=fShaderSrc();
	} else {
		vshSrc=sources.vsh;
		fshSrc=sources.fsh;
	}
	const fractalProg = new context.Program (vshSrc, fshSrc);

	gl.useProgram (fractalProg[GLNAME]);
	gl.uniform1i(fractalProg.sourceTex, 0);
	gl.uniform1f(fractalProg.blending, texopts.blending);
	gl.uniform4fv(fractalProg.weights, new Float32Array(texopts.weights));
	gl.bindTexture(gl.TEXTURE_2D, basisTex[GLNAME]);
	gl.vertexAttribPointer(fractalProg.coord, 4, gl.FLOAT, false, 
		0, 0);
	gl.drawElements(gl.TRIANGLES, 6 , gl.UNSIGNED_SHORT, 0);

	gl.useProgram(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.deleteProgram(fractalProg[GLNAME]);
	gl.deleteBuffer(simpleSquareVertexBuffer);
	gl.deleteBuffer(simpleSquareIndexBuffer);

	gl.bindTexture(gl.TEXTURE_2D, fractalTex[GLNAME]);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fbo);

	return fractalTex;

}

function textureOptions (context, options) {
	const gl = context[GLNAME]; 
	const weights = (options && options.weights && options.weights instanceof Array && options.weights.length == 4 && options.weights) 
		|| [0.299, 0.587, 0.114, 0.0];
	let opts = Texture.options(context, options); 
	opts.weights = weights;
	opts.blending = (options && options.blending) || 0.0;
	return opts;
}

function vShaderSrc() {
	return `
in vec4 coord;

out vec2 textureCoord;
out vec4 spaceCoord;

void main()
{
	gl_Position =  spaceCoord = vec4(coord.xy, 0.0, 1.0);
	textureCoord = coord.zw;     
}
`
}

function fShaderSrc() {
	return `
precision highp float;

in vec2 textureCoord;
out vec4 fragment_color;

uniform sampler2D sourceTex;
uniform vec4 weights;
uniform float blending;

/*const float lacunarity = 2.0;*/  /* In here, lacunarity MUST be an
								  integer, in order to preserve 
								  tilability. Given that, might
								  as well hardcode the values as
								  powers of two.*/

const float normalizer = 
	1.0 / 1.1541365 /* sqrt of sum of squares of 1.0 0.5 0.25 etc. */
		* 4.0/5.0 /* attenuate the [0, 1] range of original sampled values */
		;
const float turbNormalizer = 0.5; 

const float fractalSumNormalizer = 
		1.0 / 0.5761944 /* sqrt of sum of squares of 0.5, 0.25, etc. */
		* 5.0 / 5.0
		;

float turbTransform( in vec4 thesample ) {
	float x = dot(weights, thesample);
	return abs( 1.0 - 2.0*x*x );
}

void main(void)
{
	vec4 thesample[5];
	thesample[0] = texture(sourceTex, textureCoord);
	thesample[1] = texture(sourceTex, 2.0*textureCoord);
	thesample[2] = texture(sourceTex, 4.0*textureCoord);
	thesample[3] = texture(sourceTex, 8.0*textureCoord);
	thesample[4] = texture(sourceTex, 16.0*textureCoord);

	vec4 fractalSum = ( 
		0.5 * thesample[1]
		+ 0.25 * thesample[2] 
		+ 0.125 * thesample[3]
		+ 0.0625 * thesample[4]
		);
	
	float origIntens = dot(weights, thesample[0]);
	float fractIntens = dot(weights, fractalSum);
	float noiseIntens = (origIntens + fractIntens) * normalizer;
	float intensity = mix (
		clamp(noiseIntens, 0.0, 1.0)
		, mix( origIntens,
				clamp(fractIntens*fractalSumNormalizer, 0.0, 1.0),
				clamp((1.0 - thesample[0].a)*fractalSum.a*fractalSumNormalizer, 0.0, 1.0) )
		
		, blending);
	
	float turbulence = ( 
		turbTransform(thesample[0])
		+ 0.5 * turbTransform(thesample[1])
		+ 0.25 * turbTransform(thesample[2])
		+ 0.125 * turbTransform(thesample[3])
		+ 0.0625 * turbTransform(thesample[4])
		) * turbNormalizer;

	fragment_color = vec4(
		clamp(intensity, 0.0, 1.0),
		clamp(turbulence, 0.0, 1.0),
		thesample[0].xy );
}
`
}

export { Texture }
