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

// Renders a map within the DOM element specified by svg_id.
function render(data, svg_id) {
    let ball_scale = 200000;
    let ball_size = 6;
    let ball_row = 5;

    let tip = d3.tip().offset([-5,0]).attr('class', 'd3-tip').html(function(d) {
        let dem_count = getDemCount(d.properties.abbr, vis_state.data[1])
        let rep_count = getRepCount(d.properties.abbr, vis_state.data[1])

        let _html = "<table style='font-weight: normal; font-size:9pt; font-family: sans-serif';>";
        _html += "<tr><td colspan='3' style='padding-bottom: 5px; text-align: center; font-size: 12pt; font-weight: bold;'>"+d.properties.name+"</td></tr>";
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
    let barmap = d3.scaleLinear().domain([0,ball_scale]).range([0,ball_size]);

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(us.features)
        .enter().append("path")
        .attr("stroke", "gray")
        .attr("stroke-width", "1px")
        .attr("fill", function(d) { return colormap(getDifferencePercent(d.properties.abbr, data[1]));})
        .attr("d", path)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)

    svg.selectAll(".dem_bar_group").data(us_centers).enter().append("g")
        .attr("transform",d => "translate(" + projection([d.long,d.lat])[0] + "," + projection([d.long,d.lat])[1] + ") scale(" + projection_scale + " " + projection_scale + ")")
            .selectAll(".dem_bar").data(d => {
                let count = getDemCount(d.stateid, data[1])
                let barwidths = []
                for (let i=0; i < Math.floor(count / ball_scale); i++) {
                    barwidths.push(ball_scale)
                }
                barwidths.push(count % ball_scale)
                return barwidths
            }).enter().append("rect")
                .attr("class", "dem_bar")
                .attr("x", (d,i) => 0 - ((i%ball_row)+1)*ball_size + (ball_size - barmap(d)))
                .attr("y", (d,i) => -ball_size + Math.floor(i/ball_row) * -ball_size)
                .attr("width", d => barmap(d))
                .attr("height", ball_size)
                .attr("fill","url(#bluecircles")
                .attr("r",ball_size/2)
                .style("pointer-events", "none")

    svg.selectAll(".rep_bar_group").data(us_centers).enter().append("g")
        .attr("transform",d => "translate(" + projection([d.long,d.lat])[0] + "," + projection([d.long,d.lat])[1] + ") scale(" + projection_scale + " " + projection_scale + ")")
        .selectAll(".rep_bar").data(d => {
            let count = getRepCount(d.stateid, data[1])
            let barwidths = []
            for (let i=0; i < Math.floor(count / ball_scale); i++) {
                barwidths.push(ball_scale)
            }
            barwidths.push(count % ball_scale)
            return barwidths
        }).enter().append("rect")
            .attr("class", "rep_bar")
            .attr("x", (d,i) => (i%ball_row)*ball_size)
            .attr("y", (d,i) => -ball_size + Math.floor(i/ball_row) * -ball_size)
            .attr("width", d => barmap(d))
            .attr("height", ball_size)
            .attr("fill","url(#redcircles")
            .attr("r",ball_size/2)
            .style("pointer-events", "none")
}
