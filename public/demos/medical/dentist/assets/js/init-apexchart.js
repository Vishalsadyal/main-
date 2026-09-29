(function($) {
	
var handleChart = function(){
	
	var screenWidth = $(window).width();

	var handleProgressChart = function(){
		var options = {
			series: [82],
			chart: {
				type: 'radialBar',
				offsetY: -15,
				height: '240px',
			},
			plotOptions: {
				radialBar: {
					startAngle: -135,
					endAngle: 135,
					
					hollow: {
						size: '80%',
					},	
					track: {
						background: "var(--bs-primary-bg-subtle)",
						strokeWidth: '80%',
					},
					dataLabels: {
						name: {
							show: false
						},
						value: {
							offsetY: 15,
							fontSize: '50px',
							color: 'var(--bs-primary)',
							fontWeight: '600',
							fontFamily: 'var(--font-family-base)',
						}
					}
				}
			},
			stroke:{
				lineCap: 'round',
			},
			colors:['var(--bs-primary)'],
        };

        var chart = new ApexCharts(document.querySelector("#progressChart"), options);
        chart.render();
	}
	
	
	/* Function ============ */
		return {
			load:function(){
				handleProgressChart();
			},
		}
	
	}();

	jQuery(window).on('load',function(){
		setTimeout(function(){
			handleChart.load();
		}, 500); 
		
	});

})(jQuery);