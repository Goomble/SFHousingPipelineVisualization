var urls = {
  basemap: "resources/district.geojson",
  housingpoints: "resources/Affordable_Housing_Pipeline.csv",
};

var colorscale = d3.scaleSequential(d3.interpolateReds);
var colorscaleforpie = d3.scaleSequential(d3.interpolateReds);

var districtinfo = ["Inner Richmond, Outter Richmond", "Presidio, Marina, Pacific Heights", "Persidio Heights", "North Beach, Chinatown, Fisherman’s Wharf, Union Square", "Sunset, Parkside", "Fillmore/Western Addition, Lower Height, Inner Sunset, JapanTown", "Tenderloin, South of Market, Mid-Market/Civic Center", "Park Merced, West Twin Peaks", "Castro, Glen Park, Noe Valley", "Mission District, Bernal Heights", "Bayview Hunters Points, Potrero", "Excelsior, Ocean View"];


var width = 250,
    height = 400,
    radius = Math.min(width, height) / 2;
    
var pathforpie = d3.arc()
    .outerRadius(radius - 10)
    .innerRadius(0);
    
var label = d3.arc()
    .outerRadius(radius - 40)
    .innerRadius(radius - 40)

var svg = d3.select("body").select("#map");

var gforbarchar = svg.append("g").attr("transform", "translate(845,450)");


var g = {
    basemap: svg.append("g").attr("id", "basemap"),
    housingpoints: svg.append("g").attr("id", "housingpoints"),
    tooltip: svg.append("g").attr("id", "tooltip"),
    details: svg.append("g").attr("id", "details"),
    legend: svg.append("g").attr("id", "legend"),
    button: svg.append("g").attr("id", "button")
};

var projection = d3.geoConicEqualArea();
var path = d3.geoPath().projection(projection);
projection.parallels([37.692514, 37.840699]);

projection.rotate([122, 0]);


var q = d3.queue()
  .defer(d3.json, urls.basemap)
  .await(drawMap);

function drawMap(error, basemap) {
  if (error) throw error;
    
  // make sure basemap fits in projection
  projection.fitSize([960, 600], basemap);

  // draw basemap
  var land = g.basemap.selectAll("path.land")
    .data(basemap.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");
    
    g.basemap.selectAll("path.neighborhood")
    .data(basemap.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "neighborhood");

    
  // used to show neighborhood outlines on top of streets
  g.basemap.selectAll("path.neighborhood")
    .data(basemap.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "neighborhood")
    .each(function(d) {
      // save selection in data for interactivity
      d.properties.outline = this;
    });

//   setup tooltip (shows neighborhood name)
  var tip = g.tooltip.append("text").attr("id", "tooltip");
  tip.attr("text-anchor", "end");
  tip.attr("dx", -5);
  tip.attr("dy", -5);
  tip.style("visibility", "hidden");
    
  var details = g.details.append("foreignObject")
    .attr("id", "details")
    .attr("width", 960)
    .attr("height", 600)
    .attr("x", 0)
    .attr("y", 0);

  var body = details.append("xhtml:body")
    .style("text-align", "left")
    .style("background", "none")
    .html("<p>N/A</p>");

  details.style("visibility", "hidden");

    
  land.on("mouseover", function(d) {
    tip.text(d.properties.supervisor);
    tip.style("visibility", "visible");
    d3.select(d.properties.outline).raise();
    d3.select(d.properties.outline).classed("active", true);
    
    body.html("<table border=0 cellspacing=0 cellpadding=2>" + "\n" +
      "<tr><th>Supervisor District: </th><td><b>" + d.properties.supervisor + "</b></td></tr>" + "\n" +
      "<tr><th>Supervisor District Representative:  </th><td><b>" + d.properties.supname + "</b></td></tr>" + "\n" +
      "<tr><th>Notable Neighborhoods: </th><td><b>" + districtinfo[(+d.properties.supervisor - 1)] + "</b></td></tr>" +
      "</table>");

    details.style("visibility", "visible");
    })
    .on("mousemove", function(d) {
      var coords = d3.mouse(g.basemap.node());
      tip.attr("x", coords[0]);
      tip.attr("y", coords[1]);
    })
    .on("mouseout", function(d) {
        tip.style("visibility", "hidden");
        d3.select(d.properties.outline).classed("active", false);
    }) 
    
  
    d3.csv(urls.housingpoints, drawHousingPoints);
}

function drawHousingPoints(error, housingpoints) {
  if (error) throw error;
    
  var nested_data = d3.nest()   
        .key(function(d) { return d["Supervisor District"]; })
        .rollup(function(leaves) {return d3.sum(leaves, function(d) {return d["Affordable Units"];});})
        .entries(housingpoints);  
    
  var nested_data2 = d3.nest()   
        .key(function(d) { return d["Supervisor District"]; })
        .rollup(function(leaves) {return  {"1bd Units" : d3.sum(leaves, function(d) {return d["1bd Units"];}),
                                          "2bd Units" : d3.sum(leaves, function(d) {return d["2bd Units"];}),
                                          "3bd Units" : d3.sum(leaves, function(d) {return d["3bd Units"];}),
                                          "4bd Units" : d3.sum(leaves, function(d) {return d["4bd Units"];})                   
                                          };})
        .entries(housingpoints); 
    
  var land = svg.select("g#basemap").selectAll("path.land");
  
  for (i = 0, sourcemap = []; i < housingpoints.length; i++) {
      var sourcetmp = housingpoints[i]["Supervisor District"];
      if (sourcemap.indexOf(sourcetmp) < 0) {
          sourcemap.push(sourcetmp);
      }
  }
    
 colorscale.domain([0, d3.max(nested_data, function(d) {return d.value;})]);
    
 var legend = svg.selectAll(".legend")
      .data(colorscale.ticks(6).slice(1).reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(" + (0) + "," + (20 + i * 20 + 100) +")"; });

  legend.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", colorscale); 
    
  legend.append("text")
      .attr("x", 26)
      .attr("y", 10)
      .attr("dy", ".35em")
      .text(String);

  svg.append("text")
      .attr("class", "label")
      .attr("x", 0)
      .attr("y", 10)
      .attr("dy", "11em")
      .attr("dx", "0.35em")
      .text("# of Affordable Appartments");
    
  svg.append("text")
     .attr("class", "piechartlabel")
     .attr("x", width + 20)
     .attr("y", 10)
     .attr("dy", "25em")
     .attr("dx", "43em")
     .text("Appartment Types");
        

 land.style("fill", function(d) {
     for (i = 0; i < nested_data.length; i++) {
         if(nested_data[i].key === d.properties.supervisor) {
             return colorscale(nested_data[i].value);
         }
     }
 })
 
 d3.csv("resources/forpie.csv", function(data) {
     
    var pie = d3.pie()
    .sort(null)
    .value(function(d) {return d.Amount; });

    var arc = gforbarchar.selectAll(".arc")
    .data(pie(data))
    .enter().append("g")
      .attr("class", "arc");

    var tip = g.tooltip.append("text").attr("id", "tooltip");
    tip.attr("text-anchor", "end");
    tip.attr("dx", -5);
    tip.attr("dy", -5);
    tip.style("visibility", "hidden");
     
    colorscaleforpie.domain([0, d3.max(data, function(d) {return +d.Amount})]);
     
    var ifon = false;

    arc.append("path").attr("d", pathforpie)
    .attr("fill", function(d) { return colorscaleforpie(d.data.Amount)})
    .attr("stroke", "black")
    .on("mouseover", function(d) {
      tip.text(d.data.Amount);
      tip.style("visibility", "visible");
      var me = d3.select(this);
      var on = me.classed("on");
      if (!ifon) {
          colorscale.domain([0, d3.max(nested_data2, function(inner) {return inner.value[d.data.Type]})                  
          ]);
        var t = d3.transition()
        .duration(750);

        land.transition(t).style("fill", function(inner) {
         for (i = 0; i < nested_data2.length; i++) {
             if(nested_data2[i].key === inner.properties.supervisor) {
                 return colorscale(nested_data2[i].value[d.data.Type]);
             }
         }
        });
        svg.selectAll(".legend").remove();
        svg.select(".label").remove();

        legend = svg.selectAll(".legend")
          .data(colorscale.ticks(6).slice(1).reverse())
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(" + (0) + "," + (20 + i * 20 + 100) +")"; });

        legend.append("rect")
          .attr("width", 20)
          .attr("height", 20)
          .style("fill", colorscale); 

        legend.append("text")
          .attr("x", 26)
          .attr("y", 10)
          .attr("dy", ".35em")
          .text(String);    


        svg.append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 10)
          .attr("dy", "11em")
          .attr("dx", ".35em")
          .text("# of " + d.data.Type);
      }
    })
    .on("mousemove", function(d) {
          var coords = d3.mouse(g.basemap.node());
          tip.attr("x", coords[0]);
          tip.attr("y", coords[1]);
    })
    .on("mouseout", function(d) {
     tip.style("visibility", "hidden");
        
     var me = d3.select(this);
     var on = me.classed("on");
        
     if(!ifon) {
    
         var t = d3.transition()
        .duration(750);

         colorscale.domain([0, d3.max(nested_data, function(d) {return d.value;})]);

         land.transition(t).style("fill", function(inner) {
         for (i = 0; i < nested_data.length; i++) {
             if(nested_data[i].key === inner.properties.supervisor) {
                 return colorscale(nested_data[i].value);
             }
         }
     })

        svg.selectAll(".legend").remove();
        svg.select(".label").remove();
        legend = svg.selectAll(".legend")
          .data(colorscale.ticks(6).slice(1).reverse())
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(" + (0) + "," + (20 + i * 20 + 100) +")"; });

        legend.append("rect")
          .attr("width", 20)
          .attr("height", 20)
          .style("fill", colorscale); 

        legend.append("text")
          .attr("x", 26)
          .attr("y", 10)
          .attr("dy", ".35em")
          .text(String);

        svg.append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 10)
          .attr("dy", "11em")
          .attr("dx", "0.35em")
          .text("# of Affordable Appartments");
     }
    
    })
    .on("click", function(outer) {
        var me = d3.select(this);
        var on = me.classed("on");
        if (!on) {
            me.classed("on", true);
            ifon = true;
        }
        else {
            me.classed("on", false);
            ifon = false;
        }        
    });
     
      arc.append("text")
      .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
      .attr("dy", "0.35em")
      .attr("dx", "-0.8em")
      .text(function(d) {return d.data.Type.split(" ")[0]; })
      .style("fill", "red");
     
     
     
 })
       
}

function translate(x, y) {
  return "translate(" + String(x) + "," + String(y) + ")";
}

    
    