import * as Cesium from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import $ from "jquery";
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjZmU5YzljMS0xYzY0LTQ1OTAtYTRmYi1lNTk2MDQwM2Q4ZjAiLCJpZCI6ODk2MjQsImlhdCI6MTY0OTg0MTIwNX0.S0JwQpzcNV0rzYePeGYQFuT18TChDTe8U3Q5EaxvCac";
let fData = [];
let states = [];
document.getElementById("states").onchange = function () {
  changeState();
};

window.onload = function () {
  var fileInput = document.getElementById("csv"),
    readFile = function () {
      var reader = new FileReader();
      reader.onload = function () {
        reader.result.split("\n").forEach((data, index) => {
          if (index != 0) {
            let rowData = data.split(",");
            if (rowData[2] === "NY") {
              fData.push({
                name: rowData[0],
                city: rowData[1],
                state: rowData[2],
                Htype: rowData[3],
                lat: rowData[4],
                long: rowData[5],
                x: rowData[6],
                y: rowData[7],
              });
            }
            states.push(rowData[2]);
          }
        });
        debugger;
        states = [...new Set(states)];
        let select = document.getElementById("states");
        states.forEach((s, index) => {
          var opt = document.createElement("option");
          opt.value = index;
          opt.innerHTML = s;
          select.appendChild(opt);
        });
        console.log(fData);
        cesiumLoad(fData);
      };
      // start reading the file. When it is done, calls the onload event defined above.
      reader.readAsBinaryString(fileInput.files[0]);
    };

  fileInput.addEventListener("change", readFile);
  data = $.csv.toArrays(csvd);
};

const cesiumLoad = (data) => {
  Cesium.Math.setRandomNumberSeed(1234);

  const viewer = new Cesium.Viewer("cesiumContainer", { infoBox: false });
  const entities = viewer.entities;

  let i;
  let height;
  let positions;
  const stripeMaterial = new Cesium.StripeMaterialProperty({
    evenColor: Cesium.Color.WHITE.withAlpha(0.5),
    oddColor: Cesium.Color.BLUE.withAlpha(0.5),
    repeat: 5.0,
  });

  data.forEach((d, index) => {
    let lat = parseFloat(d["x"]);
    let long = parseFloat(d["y"]);
    let color = Cesium.Color.fromRandom({ alpha: 1.0 });
    let Htype = d["Htype"];
    if (Htype === "CRITICAL ACCESS") {
      color = Cesium.Color.RED;
    } else if (Htype === "GENERAL ACUTE CARE") {
      color = Cesium.Color.GREEN;
    } else if (Htype === "LONG TERM CARE") {
      color = Cesium.Color.LIGHTPINK;
    } else if (Htype === "PSYCHIATRIC") {
      color = Cesium.Color.BLACK;
    } else {
      color = Cesium.Color.WHITE;
    }
    entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([
            lat + 0.3,
            long,
            lat,
            long,
            lat,
            long + 0.3,
            lat + 0.3,
            long + 0.3,
          ])
        ),
        height: 300000.0,
        extrudedHeight: 2000.0,
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        material: color,
      },
    });
  });

  viewer.zoomTo(viewer.entities);
};

const changeState = () => {};
