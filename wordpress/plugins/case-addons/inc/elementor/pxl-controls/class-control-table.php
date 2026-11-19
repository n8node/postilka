<?php
class Pxltheme_Core_Table_Control extends \Elementor\Base_Data_Control {

    public function get_type() {
        return 'pxl_table';
    }

    public function enqueue() {
        wp_enqueue_style('pxl-table-css', PXL_URL . 'assets/css/table-control.css', [], '1.0.1');
        wp_enqueue_script('pxl-table-js', PXL_URL . 'assets/js/table-control.js', ['jquery', 'elementor-editor'], '1.0.1', true);
    }

    protected function get_default_settings() {
        return [
            'rows' => 3,
            'cols' => 3, 
            'first_row_as_header' => true,
            'button_text' => esc_html__('Add Row', PXL_TEXT_DOMAIN),
        ];
    }

    public function content_template() {
        $control_uid = $this->get_control_uid();
        ?>
        <div class="elementor-control-field">
            <# if ( data.label ) { #>
                <label for="<?php echo esc_attr($control_uid); ?>" class="elementor-control-title">{{{ data.label }}}</label>
            <# } #>
            <div class="elementor-control-input-wrapper">
                <textarea id="<?php echo esc_attr($control_uid); ?>" class="elementor-control-tag-area" data-setting="{{ data.name }}" style="display: none;"></textarea>
                <div class="pxl-table-wrapper">
                    <table class="pxl-table-control">
                        <thead>
                            <tr>
                                <# 
                                var tableData = [];
                                
                                try {
                                    if (data.controlValue) {
                                        if (typeof data.controlValue === 'string') {
                                            tableData = JSON.parse(data.controlValue);
                                        } else if (typeof data.controlValue === 'object') {
                                            tableData = data.controlValue;
                                        }
                                    }
                                } catch(e) {
                                    console.error('Error parsing table data:', e);
                                    tableData = [];
                                }
                                
                                // Determine actual column count from the saved data
                                var cols;
                                if (tableData.length && tableData[0]) {
                                    cols = tableData[0].length;
                                } else {
                                    cols = data.cols || 3;
                                }
                                
                                for (var col = 0; col < cols; col++) { 
                                #>
                                    <th data-col="{{ col }}">
                                        <span><?php echo esc_html__('Column', PXL_TEXT_DOMAIN); ?> {{ col + 1 }}</span>
                                        <button type="button" class="pxl-table-col-delete" data-col="{{ col }}">
                                            <i class="eicon-close"></i>
                                        </button>
                                    </th>
                                <# } #>
                                <th class="pxl-table-col-actions">
                                    <button type="button" class="pxl-table-add-col">
                                        <i class="eicon-plus"></i>
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <# 
                            var rowCount = data.rows || 3;
                            
                            if (!tableData.length) {
                                for (var r = 0; r < rowCount; r++) {
                                    var row = [];
                                    for (var c = 0; c < cols; c++) {
                                        row.push('');
                                    }
                                    tableData.push(row);
                                }
                            }
                            
                            for (var rowIdx = 0; rowIdx < tableData.length; rowIdx++) {
                                while (tableData[rowIdx].length < cols) {
                                    tableData[rowIdx].push('');
                                }
                            }
                            
                            for (var row = 0; row < tableData.length; row++) {
                                var rowData = tableData[row] || [];
                            #>
                                <tr data-row="{{ row }}">
                                    <# for (var col = 0; col < cols; col++) { 
                                        var cellValue = rowData[col] || '';
                                        var isHeader = (row === 0 && data.first_row_as_header);
                                        var cellTag = isHeader ? 'th' : 'td';
                                    #>
                                        <{{ cellTag }} data-col="{{ col }}">
                                            <div class="pxl-table-cell-container">
                                                <textarea class="pxl-table-cell-input" data-row="{{ row }}" data-col="{{ col }}" rows="1">{{ cellValue }}</textarea>
                                            </div>
                                        </{{ cellTag }}>
                                    <# } #>
                                    <td class="pxl-table-row-actions">
                                        <button type="button" class="pxl-table-row-delete" data-row="{{ row }}">
                                            <i class="eicon-close"></i>
                                        </button>
                                    </td>
                                </tr>
                            <# } #>
                        </tbody>
                    </table>
                    
                    <div class="pxl-table-add-row-wrapper">
                        <button type="button" class="elementor-button elementor-button-default pxl-table-add-row">
                            <i class="eicon-plus"></i>
                            <span>{{{ data.button_text }}}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <# if (data.description) { #>
            <div class="elementor-control-field-description">{{{ data.description }}}</div>
        <# } #>
        <?php
    }
}