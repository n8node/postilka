<?php
$sidebar_type = $settings['sidebar_type'];
if($sidebar_type !== 'none'){
    dynamic_sidebar($sidebar_type);
} 
?>