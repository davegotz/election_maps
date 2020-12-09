// Start by loading the map data and the election statistics.
Promise.all([
    d3.json("us-states.json"),
    // d3.csv("election2020.csv"), // If the Cook Political Report data goes away, we can use the local saved copy from 12/09/2020
    d3.csv("https://docs.google.com/spreadsheets/d/e/2PACX-1vS3Z8Rq9xqOLISwoKdK0n6CFLBuPSCoXbbLeY8vhi-rzFS3ZFNEtR0BCdEbHcS-2Tlh5aPcnZbwBLao/pub?output=csv"),
    d3.csv("us-states-centers.csv")
])
.then(ready);

let vis_state = {};

// The callback which renders the page after the data has been loaded.
function ready(data) {
    vis_state.data = data;
    vis_state.total_mode = true;
    vis_state.svg_id = "#usmap"
    render(data, vis_state.svg_id);
}

function getDifferencePercent(state_id, election_data) {
    let matching = election_data.filter(d => d.stateid === state_id);
    if (matching.length > 0) {
        let state_data = matching[0];
        let dems = parseFloat(state_data.dem_votes.replace(/,/g, ''));
        let reps = parseFloat(state_data.rep_votes.replace(/,/g, ''));
        return (dems-reps) / (dems+reps);
    }
    return 0;
}

function getDemCount(state_id, election_data) {
    let matching = election_data.filter(d => d.stateid === state_id);
    if (matching.length > 0) {
        let state_data = matching[0];
        let dems = parseFloat(state_data.dem_votes.replace(/,/g, ''));
        return dems
    }
    return 0;
}

function getRepCount(state_id, election_data) {
    let matching = election_data.filter(d => d.stateid === state_id);
    if (matching.length > 0) {
        let state_data = matching[0];
        let reps = parseFloat(state_data.rep_votes.replace(/,/g, ''));
        return reps
    }
    return 0;
}

function set_mode(mode) {
    if (mode === 'total') {
        vis_state.total_mode = true;
    }
    else {
        vis_state.total_mode = false;
    }

    let svg = d3.select(vis_state.svg_id);

    let barmap = d3.scaleLinear().domain([0,10000000]).range([0,100]).clamp(true);

    let projection_scale = .75
    let projection = d3.geoAlbersUsa()
        .translate([1200*projection_scale / 2, 800*projection_scale / 2]) // translate to center of screen
        .scale([1600*projection_scale]); // scale things down so see entire US

    if (true === vis_state.total_mode) {
        // Select the bars,
        svg.selectAll(".dem_bar")
            .transition().duration(500)
                .attr("x",d => projection([d.long,d.lat])[0] - 11)
                .transition().duration(500)
                    .attr("y",d => projection([d.long,d.lat])[1] - barmap(getDemCount(d.stateid, vis_state.data[1])))
                    .attr("height", d => barmap(getDemCount(d.stateid, vis_state.data[1])))

        svg.selectAll(".rep_bar")
            .transition().duration(500)
                .attr("x",d => projection([d.long,d.lat])[0] + 1)
                .transition().duration(500)
                    .attr("y",d => projection([d.long,d.lat])[1] - barmap(getRepCount(d.stateid, vis_state.data[1])))
                    .attr("height", d => barmap(getRepCount(d.stateid, vis_state.data[1])))

        svg.selectAll(".mouse_bar")
            .transition().duration(500).delay(500)
            .attr("y",d => projection([d.long,d.lat])[1] - barmap(Math.max(getRepCount(d.stateid, vis_state.data[1]),getDemCount(d.stateid, vis_state.data[1]))) -5)
            .attr("height", d => barmap(Math.max(getRepCount(d.stateid, vis_state.data[1]),getDemCount(d.stateid, vis_state.data[1]))) + 10)

    }
    else {
        // Select the bars,
        svg.selectAll(".dem_bar")
            .transition().duration(500)
                .attr("y",d => projection([d.long,d.lat])[1] - barmap(getDemCount(d.stateid, vis_state.data[1]) - getRepCount(d.stateid, vis_state.data[1])))
                .attr("height", d => barmap(getDemCount(d.stateid, vis_state.data[1]) - getRepCount(d.stateid, vis_state.data[1])))
                .transition().duration(500)
                    .attr("x",d => projection([d.long,d.lat])[0] - 5)

        svg.selectAll(".rep_bar")
            .transition().duration(500)
                .attr("y",d => projection([d.long,d.lat])[1] - barmap(getRepCount(d.stateid, vis_state.data[1]) - getDemCount(d.stateid, vis_state.data[1])))
                .attr("height", d => barmap(getRepCount(d.stateid, vis_state.data[1]) - getDemCount(d.stateid, vis_state.data[1])))
                .transition().duration(500)
                    .attr("x",d => projection([d.long,d.lat])[0] - 5)

        svg.selectAll(".mouse_bar")
            .transition().duration(500)
            .attr("y",d => projection([d.long,d.lat])[1] - barmap(Math.abs(getRepCount(d.stateid, vis_state.data[1]) - getDemCount(d.stateid, vis_state.data[1]))) - 5)
            .attr("height",d => barmap(Math.abs(getRepCount(d.stateid, vis_state.data[1]) - getDemCount(d.stateid, vis_state.data[1]))) + 10)
    }
}
// Renders a map within the DOM element specified by svg_id.
function render(data, svg_id) {
    let tip = d3.tip().offset([-5,0]).attr('class', 'd3-tip').html(function(d) {
        let dem_count = getDemCount(d.stateid, vis_state.data[1])
        let rep_count = getRepCount(d.stateid, vis_state.data[1])

        let _html = "<table style='font-weight: normal; font-size:9pt; font-family: sans-serif';>";
        _html += "<tr><td colspan='3' style='padding-bottom: 5px; text-align: center; font-size: 12pt; font-weight: bold;'>"+d.name+"</td></tr>";
        _html += "<tr><td>Joe Biden</td><td style='text-align: right; padding-left: 5px; padding-right: 5px;'>" + dem_count.toLocaleString('en')  + "</td><td style='text-align: right;'>"+(100*dem_count/(dem_count+rep_count)).toFixed(1)+"%</td></tr>";
        _html += "<tr><td>Donald Trump</td><td style='text-align: right; padding-left: 5px; padding-right: 5px;'>" + rep_count.toLocaleString('en')  + "</td><td style='text-align: right;'>"+(100*rep_count/(dem_count+rep_count)).toFixed(1)+"%</td></tr>";
        _html += "<tr><td>Margin</td><td style='text-align: right; padding-left: 5px; padding-right: 5px;'>" + Math.abs(dem_count - rep_count).toLocaleString('en') + "</td><td style='text-align: right;'>"+(100*Math.abs(dem_count-rep_count)/(dem_count+rep_count)).toFixed(1)+"%</td></tr>";
        return _html;
    });

    let us = data[0];
    let us_centers = data[2];

    let projection_scale = .75
    let projection = d3.geoAlbersUsa()
        .translate([1200*projection_scale / 2, 800*projection_scale / 2]) // translate to center of screen
        .scale([1600*projection_scale]); // scale things down so see entire US

    // Define path generator
    let path = d3.geoPath().projection(projection);

    let svg = d3.select(svg_id);

    svg.call(tip);

    let colormap = d3.scaleLinear().domain([5.0,0,-5.0]).range(["blue", "#ffffff", "red"]);
    let barmap = d3.scaleLinear().domain([0,10000000]).range([0,100]);

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(us.features)
        .enter().append("path")
        .attr("stroke", "gray")
        .attr("stroke-width", "1px")
        .attr("fill", function(d) { return colormap(getDifferencePercent(d.properties.abbr, data[1]));})
        .attr("d", path);

    svg.selectAll(".dem_bar").data(us_centers).enter().append("rect")
        .attr("class", "dem_bar")
        .attr("x",d => projection([d.long,d.lat])[0] - 11)
        .attr("y",d => projection([d.long,d.lat])[1] - barmap(getDemCount(d.stateid, data[1])))
        .attr("height", d => barmap(getDemCount(d.stateid, data[1])))
        .attr("width", 10)
        .attr("fill","blue")
        .attr("r","5")

    svg.selectAll(".rep_bar").data(us_centers).enter().append("rect")
        .attr("class", "rep_bar")
        .attr("x",d => projection([d.long,d.lat])[0] + 1)
        .attr("y",d => projection([d.long,d.lat])[1] - barmap(getRepCount(d.stateid, data[1])))
        .attr("height", d => barmap(getRepCount(d.stateid, data[1])))
        .attr("width", 10)
        .attr("fill","red")
        .attr("r","5")

    svg.selectAll(".mouse_bar").data(us_centers).enter().append("rect")
        .attr("class", "mouse_bar")
        .attr("x",d => projection([d.long,d.lat])[0] - 11)
        .attr("y",d => projection([d.long,d.lat])[1] - barmap(Math.max(getRepCount(d.stateid, data[1]),getDemCount(d.stateid, data[1]))) -5)
        .attr("width", 22)
        .attr("height", d => barmap(Math.max(getRepCount(d.stateid, data[1]),getDemCount(d.stateid, data[1]))) + 10)
        .attr("fill","black")
        .attr("opacity",0)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
}
