$('#files').change(function(event) {
    var files = event.target.files; // FileList object
    var filedata; //needed just to make events trigger


    var finalCanvas = document.createElement('canvas'),
      ctx2 = finalCanvas.getContext('2d');

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {
      if (f.type.match('image.*')) {
        //Deal with regular image here
        console.log("I got an image");
      } else if (f.type.match('application/pdf')) {
        var totalHeight = 0; //Total height of all pages in pdf
        var imageHieghts = []; //Interval spacing of pages
        var docWidth = 0;
        var u8_2;
        var reader = new FileReader();

        reader.onload = (function(theFile) {
          return function(e) {

            base64Result = e.target.result.toString();

            //Convert base 64 result to Uint8
            BASE64_MARKER = ';base64,';
            base64Index = base64Result.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
            base64 = base64Result.substring(base64Index);
            raw = window.atob(base64);
            rawLength = raw.length;
            array = new Uint8Array(new ArrayBuffer(rawLength));

            for (i = 0; i < rawLength; i++) {
              array[i] = raw.charCodeAt(i);
            }
            u8_2 = array;
          };
        })(f);

        reader.onloadend = (function(theFile) {
          return function(e) {
            PDFJS.disableWorker = true;

            //Create off screen canvas to render to
            var canvas = document.createElement('canvas'),
              ctx = canvas.getContext('2d'),
              pages = [],
              currentPage = 1;

            //fetch pdf
            PDFJS.getDocument(u8_2).then(function(pdf) {

              PROGRESS.max = pdf.numPages;
              PROGRESS.value = 1;

              // init parsing of first page
              if (currentPage <= pdf.numPages) getPage();

              // main entry point/function for loop
              function getPage() {

                // get idividual pages
                pdf.getPage(currentPage).then(function(page) {

                  var scale = 1.5;
                  var viewport = page.getViewport(scale);

                  //Dimensions for this pages canvas
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;

                  // capture dimensions for finalCanvas
                  totalHeight += viewport.height;
                  if (currentPage == 1) {
                    imageHieghts.push(viewport.height);
                  } else {
                    imageHieghts.push(viewport.height + imageHieghts[currentPage - 2]);
                  }
                  docWidth = viewport.width;

                  //Render this page
                  var renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                  };

                  page.render(renderContext).then(function() {
                    var base64jpeg = canvas.toDataURL('image/jpeg');

                    // store compressed image data in array
                    pages.push(base64jpeg);
                    if (currentPage < pdf.numPages) {
                      currentPage++;
                      PROGRESS.value = currentPage;
                      getPage();
                    } else {
                      done();
                    }
                  });
                });
              }
            });

            function done() {
              finalCanvas.height = totalHeight;
              finalCanvas.width = docWidth;

              currentPage = 0;
              // Intiate recursive function
              if (currentPage <= pages.length) drawPagesInOrder(ctx2);

              // Recursive so pages render in order
              function drawPagesInOrder(ctx2) {
                if (currentPage <= pages.length - 1) {
                  drawPage(currentPage, addPage, ctx2);
                  currentPage++;
                  drawPagesInOrder(ctx2);
                }
              }
            }

            //Add preview images to document
            function addPage(img, index) {
              img.style.width = '110px';
              img.style.height = '130px';
              img.style.padding = '5px';
              document.getElementById('images').appendChild(img);
            }

            function drawPage(index, callback, ctx2) {
              //For Final concated jpg
              img = new Image();
              img.onload = function() {

                //Build up final image on canvas
                if (index === 0) {
                  ctx2.drawImage(img, 0, 0);
                } else {
                  ctx2.drawImage(img, 0, imageHieghts[index - 1]);
                }

                //After all images rendered capture canvas and convert to blob
                if (index == pages.length - 1) {

                  //Capture canvas second param is compression rate
                  finalImagedocument = finalCanvas.toDataURL('image/jpeg', 0.75); //<-- compression rate

                  //Convert base 64 result to Uint8
                  BASE64_MARKER = ';base64,';
                  base64Index = finalImagedocument.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
                  base64 = finalImagedocument.substring(base64Index);
                  raw = window.atob(base64);
                  rawLength = raw.length;
                  array = new Uint8Array(new ArrayBuffer(rawLength));

                  for (i = 0; i < rawLength; i++) {
                    array[i] = raw.charCodeAt(i);
                  }

                  //Convert to blob
                  var bigBlob = new Blob([array], {
                    type: 'image/jpeg'
                  });
                  console.log(bigBlob);

                  //Open new image in new page
                  // var url = (window.webkitURL || window.URL).createObjectURL(bigBlob);
                  // location.href = url; // <-- Download
                }
              };
              img.src = pages[index];

              //For preview images
              var img = new Image();
              img.onload = function() {
                ctx.drawImage(this, 0, 0, ctx.canvas.width, ctx.canvas.height);
                callback(this, index); // invoke callback when we're done
              };
              img.src = pages[index]; // start loading the data-uri as source
            }
          };
        })(f);
        //Force reader to trigger all the above code
        filedata = reader.readAsDataURL(f);
      }
    }
});