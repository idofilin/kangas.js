# kangas.js
A more modern JavaScript helper library for WebGL applications.
This is the successor of [kangas-lib](https://github.com/idofilin/kangas-lib), with modern 
JavaScript (ES6 and later), WebGL2 by default, modules, classes, better use of promises and asynchronous functions, etc. Also containing tests.

Modules
--
- `core.js` &mdash; a wrapper class for WebGL context, and classes for
  creating, comiling and linking shaders and shader programs.
  The latter automatically provide handles for attributes and
  uniforms of shader programs, by analyzing the sahders'
  source code, using regular expressions.

- `context.js` &mdash; extends the core context class
  with extra properties and a cleanup method (called before page
  unload).

- `texture.js` &mdash; a class for creating and handling textures
  from image files, buffers, raw pixel data, etc., in various formats.

- `transforms.js` &mdash; constants and utility functions for 3D
  geometric transformations and 3D math.
  
- `renderer.js` &mdash; a class that manages animation loops, vertex
  and index buffers and data, time keeping and resize events.

- `load.js` &mdash; utility functions for asynchronously downloading
  shaders source files and other remote resources, and for
  communicating to the user the progress of download and resource processing. 

Tests
--
Contained in the __tests__ folder, and available online through the
following links:

- [test-core](https://filin.fi/kangas.js/tests/test-core.html)
  &mdash;
  basic functionality of the core graphics context class. 

- [test-context](https://filin.fi/kangas.js/tests/test-context.html)
  &mdash; functionality of the full (extended) context class.

- [test-texture](https://filin.fi/kangas.js/tests/test-texture.html)
  &mdash; testing the texture class by creating a texture from an image
  file.

- [test-transforms](https://filin.fi/kangas.js/tests/test-transforms.html)
  &mdash; testing 3D math. 

- [test-renderer](https://filin.fi/kangas.js/tests/test-renderer.html)
  &mdash;  testing animation through frame requests, lighting effect
  that varies in time, handling of vertex and index buffers, and
  geometric corrections on resize events.

- The `galaxy-small.jpg` image is by the `European Space Agency / Hubble Space Telescope`, and made available under `CC-BY-3.0` license (see http://www.spacetelescope.org/copyright/).

