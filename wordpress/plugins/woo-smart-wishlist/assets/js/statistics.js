jQuery(document).ready(function ($) {
    let chart = null;

    function updateStats() {
        const period = $('#woosw-stats-period').val();
        const from = $('#woosw-stats-from').val();
        const to = $('#woosw-stats-to').val();

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'woosw_get_stats',
                period: period,
                from: from,
                to: to,
                nonce: woosw_stats.nonce
            },
            success: function (res) {
                if (res.success) {
                    renderChart(res.data.labels, res.data.added, res.data.removed);
                    $('#woosw-total-added').text(res.data.total_added);
                    $('#woosw-total-removed').text(res.data.total_removed);

                    // update top lists
                    updateTopList($('#woosw-top-added-list'), res.data.top_added);
                    updateTopList($('#woosw-top-removed-list'), res.data.top_removed);
                }
            }
        });
    }

    function updateTopList($el, items) {
        if (items && items.length > 0) {
            $el.empty();
            items.forEach(function (item) {
                const name = item.url ? '<a href="' + item.url + '" target="_blank">' + item.name + '</a>' : item.name;
                $el.append('<li><span class="product-name">' + name + '</span><span class="product-count">' + item.count + '</span></li>');
            });
        } else {
            $el.html('<li>' + woosw_stats.no_data_text + '</li>');
        }
    }

    function renderChart(labels, added, removed) {
        const ctx = document.getElementById('woosw-stats-chart').getContext('2d');

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: woosw_stats.added_text,
                        data: added,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: woosw_stats.removed_text,
                        data: removed,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    $('#woosw-stats-period').on('change', function () {
        if ($(this).val() === 'custom') {
            $('#woosw-stats-custom-range').show();
        } else {
            $('#woosw-stats-custom-range').hide();
            updateStats();
        }
    });

    $('#woosw-stats-apply').on('click', function () {
        updateStats();
    });

    updateStats();
});
