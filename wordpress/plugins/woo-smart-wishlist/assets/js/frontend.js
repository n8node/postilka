'use strict';

(function ($) {
    var $storage = true;
    var added_ids = [];
    var key = Cookies.get('woosw_key');

    try {
        $storage = ('sessionStorage' in window && window.sessionStorage !== null);
        window.sessionStorage.setItem('woosw', 'test');
        window.sessionStorage.removeItem('woosw');
    } catch (err) {
        $storage = false;
    }

    $(function () {
        if (key === null || key === undefined || key === '') {
            key = woosw_get_key();
            woosw_set_key(key);
        }

        // Load data for the first time
        woosw_load_data();

        if ($('.woosw-custom-menu-item').length || woosw_vars.reload_count === 'yes') {
            // reload the count
            woosw_load_count();
        }

        if ($('.woosw-list-ajax').length) {
            // reload the list
            woosw_load_list();
        }

        if (woosw_vars.added_to_cart === 'yes' && woosw_vars.auto_remove === 'yes') {
            setTimeout(function () {
                woosw_load_count();
                woosw_get_data();
            }, 300);
        }

        if (woosw_vars.button_action === 'message') {
            $.notiny.addTheme('woosw', {
                notification_class: 'notiny-theme-woosw',
            });
        }
    });

    $(document).on('change', '.woosw-switcher-dropdown', function () {
        window.location = $(this).val();
    });

    $(document).on('woosw_refresh_data', function () {
        woosw_get_data();
    });

    $(document).on('woosw_refresh_count', function () {
        woosw_load_count();
    });

    $(document).on('woosw_wishlist_open', function () {
        if ($('#woosw_wishlist').hasClass('woosw-loaded')) {
            woosw_wishlist_show();
        } else {
            woosw_wishlist_load();
        }
    });

    // woovr
    $(document).on('woovr_selected', function (e, selected, variations) {
        if (woosw_vars.variations === 'yes') {
            var id = selected.attr('data-id');
            var pid = selected.attr('data-pid');

            if (id > 0) {
                $('.woosw-btn-' + pid).attr('data-id', id).removeClass('woosw-btn-added woosw-added');

                // refresh button
                woosw_refresh_button_id(id);
            } else {
                $('.woosw-btn-' + pid).attr('data-id', pid).removeClass('woosw-btn-added woosw-added');

                // refresh button
                woosw_refresh_button_id(pid);
            }
        }
    });

    // found variation
    $(document).on('found_variation', function (e, t) {
        if (woosw_vars.variations === 'yes') {
            var product_id = $(e['target']).attr('data-product_id');

            // change id
            $('.woosw-btn-' + product_id).attr('data-id', t.variation_id).removeClass('woosw-btn-added woosw-added');

            // refresh button
            woosw_refresh_button_id(t.variation_id);
        }
    });

    // reset data
    $(document).on('reset_data', function (e) {
        if (woosw_vars.variations === 'yes') {
            var product_id = $(e['target']).attr('data-product_id');

            // change id
            $('.woosw-btn-' + product_id).attr('data-id', product_id).removeClass('woosw-btn-added woosw-added');

            // refresh button
            woosw_refresh_button_id(product_id);
        }
    });

    // auto remove
    $(document.body).on('added_to_cart', function (e, fragments, cart_hash, $button) {
        if (woosw_vars.auto_remove === 'yes') {
            var product_id = parseInt($button.data('product_id'));

            if ((product_id > 0) && $('.woosw-item-' + product_id).length) {
                $('.woosw-item-' + product_id).remove();
            }

            woosw_load_count();
            woosw_get_data();
        }
    });

    // quick view
    $(document).on('click touch', '#woosw_wishlist .woosq-link, #woosw_wishlist .woosq-btn', function (e) {
        woosw_wishlist_hide();
        e.preventDefault();
    });

    // add to wishlist
    $(document).on('click touch', '.woosw-btn', function (e) {
        var $this = $(this);

        if ($this.hasClass('woosw-disabled') || $this.is(':disabled') || $this.attr('disabled')) {
            var notice = $this.attr('title') || woosw_vars.login_message;

            if (notice) {
                woosw_notice(notice);
            }

            e.preventDefault();
            return;
        }

        var id = $this.attr('data-id');
        var pid = $this.attr('data-pid');
        var product_id = $this.attr('data-product_id');
        var product_name = $this.attr('data-product_name');
        var product_image = $this.attr('data-product_image');

        if (typeof pid !== typeof undefined && pid !== false) {
            id = pid;
        }

        if (typeof product_id !== typeof undefined && product_id !== false) {
            id = product_id;
        }

        if ($this.hasClass('woosw-added')) {
            if (woosw_vars.button_action_added === 'remove') {
                // remove from  wishlist
                var data = {
                    action: 'woosw_remove', product_id: id, key: key, nonce: woosw_vars.nonce,
                };

                $this.addClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon + ' ' + woosw_vars.button_added_icon).addClass(woosw_vars.button_loading_icon);

                $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_remove'), data, function (response) {
                    $this.removeClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_loading_icon);

                    if (response.content != null) {
                        $('#woosw_wishlist').html(response.content).addClass('woosw-loaded');
                    }

                    if (response.notice != null) {
                        woosw_notice(response.notice);
                    }

                    if (response.count != null) {
                        woosw_change_count(response.count);
                    }

                    if (response.data) {
                        if ($storage) {
                            sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                        }

                        if (response.data.fragments) {
                            woosw_refresh_fragments(response.data.fragments);
                        }

                        if (response.data.ids) {
                            woosw_refresh_buttons(response.data.ids);
                            woosw_refresh_ids(response.data.ids);
                        }
                    }

                    $(document.body).trigger('woosw_remove', [product_id]);
                });
            } else if (woosw_vars.button_action_added === 'page') {
                // open wishlist page
                window.location.href = woosw_vars.wishlist_url;
            } else {
                // open wishlist popup
                if ($('#woosw_wishlist').hasClass('woosw-loaded')) {
                    woosw_wishlist_show();
                } else {
                    woosw_wishlist_load();
                }
            }
        } else {
            // add product - check if choose wishlist is enabled
            if (woosw_vars.choose_wishlist === 'yes' && woosw_vars.enable_multiple === 'yes' && $('#woosw_choose').length) {
                // fetch wishlists and show choose popup
                var choose_data = {
                    action: 'woosw_get_wishlists', nonce: woosw_vars.nonce,
                };

                $this.addClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon + ' ' + woosw_vars.button_added_icon).addClass(woosw_vars.button_loading_icon);

                $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_get_wishlists'), choose_data, function (response) {
                    $this.removeClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_loading_icon);

                    if (response.wishlists && response.wishlists.length > 1) {
                        // build and show choose popup
                        woosw_choose_build(response.wishlists, id, product_name, product_image, response.can_add_more);
                        woosw_choose_show();
                    } else if (response.can_add_more || (response.wishlists && response.wishlists.length === 1)) {
                        // 1 wishlist or can add more: show choose popup anyway
                        woosw_choose_build(response.wishlists || [], id, product_name, product_image, response.can_add_more);
                        woosw_choose_show();
                    } else {
                        // only 1 wishlist, add directly
                        woosw_add_product($this, id, product_name, product_image);
                    }
                });
            } else {
                // add directly (original behavior)
                woosw_add_product($this, id, product_name, product_image);
            }
        }

        e.preventDefault();
    });

    // choose wishlist - select a wishlist item
    $(document).on('click touch', '.woosw-choose-item', function (e) {
        e.preventDefault();
        var $this = $(this);
        var selected_key = $this.data('key');
        var product_id = $('#woosw_choose').data('product_id');
        var product_name = $('#woosw_choose').data('product_name');
        var product_image = $('#woosw_choose').data('product_image');

        // highlight selected item
        $('.woosw-choose-item').removeClass('woosw-choose-item-active');
        $this.addClass('woosw-choose-item-active');

        woosw_popup_loading();

        // set default wishlist first
        var set_data = {
            action: 'woosw_set_default', key: selected_key, nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_set_default'), set_data, function (response) {
            // update cookie key
            key = selected_key;
            woosw_set_key(selected_key);

            if (response.count != null) {
                woosw_change_count(response.count);
            }

            if (response.data) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                }

                if (response.data.fragments) {
                    woosw_refresh_fragments(response.data.fragments);
                }

                if (response.data.ids) {
                    woosw_refresh_buttons(response.data.ids);
                    woosw_refresh_ids(response.data.ids);
                }
            }

            // now add the product
            var add_data = {
                action: 'woosw_add', product_id: product_id, nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add'), add_data, function (add_response) {
                woosw_choose_hide();
                woosw_popup_loaded();

                if (woosw_vars.button_action === 'list') {
                    if (add_response.content != null) {
                        $('#woosw_wishlist').html(add_response.content).addClass('woosw-loaded');
                    }

                    if (add_response.notice != null) {
                        woosw_notice(add_response.notice.replace('{name}', '<strong>' + product_name + '</strong>'));
                    }

                    woosw_perfect_scrollbar();
                    woosw_wishlist_show();
                }

                if (woosw_vars.button_action === 'message') {
                    $('#woosw_wishlist').removeClass('woosw-loaded');

                    $.notiny({
                        theme: 'woosw',
                        position: woosw_vars.message_position,
                        image: product_image,
                        text: add_response.notice.replace('{name}', '<strong>' + product_name + '</strong>'),
                    });
                }

                if (woosw_vars.button_action === 'no') {
                    $('#woosw_wishlist').removeClass('woosw-loaded');
                }

                if (add_response.count != null) {
                    woosw_change_count(add_response.count);
                }

                if (add_response.status === 1) {
                    woosw_refresh_button_id(product_id);
                }

                if (add_response.data) {
                    if ($storage) {
                        sessionStorage.setItem('woosw_data_' + add_response.data.key, JSON.stringify(add_response.data));
                    }

                    if (add_response.data.fragments) {
                        woosw_refresh_fragments(add_response.data.fragments);
                    }

                    if (add_response.data.ids) {
                        woosw_refresh_buttons(add_response.data.ids);
                        woosw_refresh_ids(add_response.data.ids);
                    }
                }

                $(document.body).trigger('woosw_add', [product_id]);
            });
        });
    });

    // choose wishlist - close popup
    $(document).on('click touch', '#woosw_choose .woosw-popup-close', function (e) {
        woosw_choose_hide();
        e.preventDefault();
    });

    // choose wishlist - click on overlay area
    $(document).on('click touch', '#woosw_choose', function (e) {
        if (!$(e.target).closest('.woosw-popup-content').length) {
            woosw_choose_hide();
        }
    });

    // choose wishlist - save new wishlist
    function woosw_choose_save_new($row) {
        var $input = $row.find('.woosw-choose-new-name');
        var $saveBtn = $row.find('.woosw-choose-new-save');
        var name = $.trim($input.val());

        if (name === '') {
            $input.addClass('woosw-rename-error').trigger('focus');
            return;
        }

        $input.removeClass('woosw-rename-error');
        $saveBtn.prop('disabled', true);
        $row.addClass('woosw-choose-add-new-loading');

        var data = {
            action: 'woosw_add_wishlist',
            name: name,
            nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add_wishlist'), data, function (response) {
            $saveBtn.prop('disabled', false);
            $row.removeClass('woosw-choose-add-new-loading');

            // Re-fetch to get the new wishlist key
            var refetch_data = {
                action: 'woosw_get_wishlists',
                nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_get_wishlists'), refetch_data, function (wl_response) {
                if (!wl_response.wishlists) return;

                // Find newly added wishlist by name
                var newWl = null;
                $.each(wl_response.wishlists, function (i, wl) {
                    if (wl.name === name) {
                        newWl = wl;
                    }
                });

                if (!newWl) {
                    newWl = wl_response.wishlists[wl_response.wishlists.length - 1];
                }

                if (newWl) {
                    // Insert new row into the choose list, above the add-new row
                    var $list = $('#woosw_choose .woosw-choose-list');
                    var $newItem = $('<div>', {
                        'class': 'woosw-choose-item woosw-choose-item-new',
                        'data-key': newWl.key,
                    });
                    $newItem.append($('<span>', { 'class': 'woosw-choose-item-name', text: newWl.name }));
                    $newItem.append($('<span>', { 'class': 'woosw-choose-item-count', text: '(0)' }));
                    $list.append($newItem);

                    // Clear input for next entry
                    $input.val('').trigger('focus');

                    // Hide the add-new row if no more slots remain
                    if (!wl_response.can_add_more) {
                        $row.hide();
                    }
                }
            });
        }).fail(function () {
            $saveBtn.prop('disabled', false);
            $row.removeClass('woosw-choose-add-new-loading');
            $input.addClass('woosw-rename-error').trigger('focus');
        });
    }

    $(document).on('click touch', '.woosw-choose-new-save', function (e) {
        e.preventDefault();
        e.stopPropagation();
        woosw_choose_save_new($(this).closest('.woosw-choose-add-new'));
    });

    $(document).on('keydown', '.woosw-choose-new-name', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            woosw_choose_save_new($(this).closest('.woosw-choose-add-new'));
        }
    });

    // add product
    $(document).on('click touch', '.woosw-item--add span', function (e) {
        var $this = $(this);
        var key = $this.closest('.woosw-items').data('key');
        var $this_item = $this.closest('.woosw-item');
        var product_id = $this_item.attr('data-id');
        var product_name = $this_item.attr('data-product_name');
        var data = {
            action: 'woosw_add', product_id: product_id, key: key, nonce: woosw_vars.nonce,
        };

        $this.addClass('woosw-item--adding');

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add'), data, function (response) {
            $this.addClass('woosw-item--adding');

            if (response.content != null) {
                $('#woosw_wishlist').html(response.content).addClass('woosw-loaded');
            }

            if (response.notice != null) {
                woosw_notice(response.notice.replace('{name}', '<strong>' + product_name + '</strong>'));
            }

            if (response.count != null) {
                woosw_change_count(response.count);
            }

            if (response.data) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                }

                if (response.data.fragments) {
                    woosw_refresh_fragments(response.data.fragments);
                }

                if (response.data.ids) {
                    woosw_refresh_buttons(response.data.ids);
                    woosw_refresh_ids(response.data.ids);
                }
            }

            $(document.body).trigger('woosw_add', [product_id]);

            // list shortcode
            if ($this.closest('.woosw-list').length) {
                location.reload();
            }
        });

        e.preventDefault();
    });

    // remove product
    $(document).on('click touch', '.woosw-item--remove span', function (e) {
        var $this = $(this);
        var key = $this.closest('.woosw-items').data('key');
        var $this_item = $this.closest('.woosw-item');
        var product_id = $this_item.attr('data-id');
        var data = {
            action: 'woosw_remove', product_id: product_id, key: key, nonce: woosw_vars.nonce,
        };

        $this.addClass('woosw-item--removing');

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_remove'), data, function (response) {
            $this.removeClass('woosw-item--removing');
            $this_item.remove();

            // Reset add button in search results if present
            $('.woosw-search-result-item[data-id="' + product_id + '"] .woosw-search-add-btn')
                .removeClass('is-added')
                .prop('disabled', false)
                .html('<span class="woosw-search-add-icon">+</span> ' + (woosw_vars.add_text || 'Add'));

            if (response.content != null) {
                $('#woosw_wishlist').html(response.content).addClass('woosw-loaded');
            }

            if (response.notice != null) {
                woosw_notice(response.notice);
            }

            if (response.count != null) {
                woosw_change_count(response.count);
            }

            if (response.data) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                }

                if (response.data.fragments) {
                    woosw_refresh_fragments(response.data.fragments);
                }

                if (response.data.ids) {
                    woosw_refresh_buttons(response.data.ids);
                    woosw_refresh_ids(response.data.ids);
                }
            }

            $(document.body).trigger('woosw_remove', [product_id]);
        });

        e.preventDefault();
    });

    // empty wishlist
    $(document).on('click touch', '.woosw-empty', function (e) {
        var $this = $(this);

        if (confirm(woosw_vars.empty_confirm)) {
            woosw_popup_loading();

            var key = $this.data('key');
            var data = {
                action: 'woosw_empty', key: key, nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_empty'), data, function (response) {
                if (response.content != null) {
                    $('#woosw_wishlist').html(response.content).addClass('woosw-loaded');
                }

                if (response.notice != null) {
                    woosw_notice(response.notice);
                }

                if (response.count != null) {
                    woosw_change_count(response.count);
                }

                if (response.data) {
                    if ($storage) {
                        sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                    }

                    if (response.data.fragments) {
                        woosw_refresh_fragments(response.data.fragments);
                    }

                    if (response.data.ids) {
                        woosw_refresh_buttons(response.data.ids);
                        woosw_refresh_ids(response.data.ids);
                    }
                }

                woosw_popup_loaded();

                $(document.body).trigger('woosw_empty', [key]);
            });
        }

        e.preventDefault();
    });

    // click on area
    $(document).on('click touch', '.woosw-popup', function (e) {
        var woosw_content = $('.woosw-popup-content');

        if (!$(e.target).closest(woosw_content).length) {
            woosw_wishlist_hide();
            woosw_manage_hide();
        }
    });

    // continue
    $(document).on('click touch', '.woosw-continue', function (e) {
        var url = $(this).attr('data-url');
        woosw_wishlist_hide();

        if (url !== '') {
            window.location.href = url;
        }

        e.preventDefault();
    });

    // close
    $(document).on('click touch', '#woosw_wishlist .woosw-popup-close', function (e) {
        woosw_wishlist_hide();
        e.preventDefault();
    });

    // manage close
    $(document).on('click touch', '#woosw_manage .woosw-popup-close', function (e) {
        woosw_manage_hide();
        e.preventDefault();
    });

    // manage wishlists
    $(document).on('click touch', '.woosw-manage', function (e) {
        e.preventDefault();
        woosw_popup_loading();

        var data = {
            action: 'woosw_manage_wishlists', nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_manage_wishlists'), data, function (response) {
            woosw_wishlist_hide();
            $('#woosw_manage').html(response);
            woosw_manage_show();
            woosw_popup_loaded();
        });
    });

    // add wishlist
    $(document).on('click touch', '#woosw_add_wishlist', function (e) {
        e.preventDefault();
        woosw_popup_loading();

        var name = $('#woosw_wishlist_name').val();
        var data = {
            action: 'woosw_add_wishlist', name: name, nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add_wishlist'), data, function (response) {
            $('#woosw_manage').html(response);
            $('#woosw_wishlist').removeClass('woosw-loaded');
            woosw_popup_loaded();
        });
    });

    // set default
    $(document).on('click touch', '.woosw-set-default', function (e) {
        e.preventDefault();
        woosw_popup_loading();

        var key = $(this).data('key');
        var data = {
            action: 'woosw_set_default', key: key, nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_set_default'), data, function (response) {
            if (response.count != null) {
                woosw_change_count(response.count);
            }

            if ((response.products != null) && response.products.length) {
                response.products.forEach((product_id) => {
                    woosw_refresh_button_id(product_id);
                });
            }

            $('#woosw_manage').html(response.content);

            if (response.data) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                }

                if (response.data.fragments) {
                    woosw_refresh_fragments(response.data.fragments);
                }

                if (response.data.ids) {
                    woosw_refresh_buttons(response.data.ids);
                    woosw_refresh_ids(response.data.ids);
                }
            }

            $('#woosw_wishlist').removeClass('woosw-loaded');
            woosw_popup_loaded();
        });
    });

    // delete wishlist
    $(document).on('click touch', '.woosw-delete-wishlist', function (e) {
        e.preventDefault();

        if (confirm(woosw_vars.delete_confirm)) {
            woosw_popup_loading();

            var key = $(this).data('key');
            var data = {
                action: 'woosw_delete_wishlist', key: key, nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_delete_wishlist'), data, function (response) {
                $('#woosw_manage').html(response);
                $('#woosw_wishlist').removeClass('woosw-loaded');
                woosw_popup_loaded();
            });
        }
    });

    // quick rename wishlist
    $(document).on('click touch', '.woosw-rename-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $btn = $(this);
        var $wrap = $btn.closest('.woosw-item-name-wrap');
        var $link = $wrap.find('.woosw-view-wishlist');
        var $count = $wrap.closest('.woosw-item-inner').find('.woosw-item-count');
        var key = $btn.data('key');
        var currentName = $btn.data('name');

        if ($wrap.hasClass('woosw-renaming')) {
            return;
        }

        $wrap.addClass('woosw-renaming');

        var $input = $('<input>', {
            type: 'text',
            'class': 'woosw-rename-input',
            val: currentName,
            maxlength: 200,
        });

        var $saveBtn = $('<button>', {
            type: 'button',
            'class': 'woosw-rename-save',
            html: '&#10003;',
            title: woosw_vars.save_text || 'Save',
        });

        var $cancelBtn = $('<button>', {
            type: 'button',
            'class': 'woosw-rename-cancel',
            html: '&#215;',
            title: woosw_vars.cancel_text || 'Cancel',
        });

        $link.hide();
        $btn.hide();
        if ($count.length) {
            $count.hide();
        }
        $wrap.append($input).append($saveBtn).append($cancelBtn);
        $input.trigger('focus').trigger('select');

        function cancelEdit() {
            $input.remove();
            $saveBtn.remove();
            $cancelBtn.remove();
            $link.show();
            $btn.show();
            if ($count.length) {
                $count.show();
            }
            $wrap.removeClass('woosw-renaming');
        }

        function saveEdit() {
            var newName = $.trim($input.val());

            if (newName === '') {
                $input.addClass('woosw-rename-error').trigger('focus');
                return;
            }

            if (newName === currentName) {
                cancelEdit();
                return;
            }

            $saveBtn.prop('disabled', true);
            $cancelBtn.prop('disabled', true);
            $wrap.addClass('woosw-rename-saving');

            var data = {
                action: 'woosw_rename_wishlist',
                key: key,
                name: newName,
                nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_rename_wishlist'), data, function (response) {
                $wrap.removeClass('woosw-rename-saving');

                if (response && response.status === 1) {
                    var savedName = response.name;
                    $link.text(savedName);
                    $btn.data('name', savedName);
                    currentName = savedName;
                } else {
                    $input.addClass('woosw-rename-error').prop('disabled', false).trigger('focus');
                    $saveBtn.prop('disabled', false);
                    $cancelBtn.prop('disabled', false);
                    return;
                }

                cancelEdit();
            }).fail(function () {
                $wrap.removeClass('woosw-rename-saving');
                $input.addClass('woosw-rename-error').prop('disabled', false).trigger('focus');
                $saveBtn.prop('disabled', false);
                $cancelBtn.prop('disabled', false);
            });
        }

        $input.on('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });

        $saveBtn.on('click touch', function (e) {
            e.preventDefault();
            saveEdit();
        });

        $cancelBtn.on('click touch', function (e) {
            e.preventDefault();
            cancelEdit();
        });
    });

    // quick rename on wishlist detail page
    $(document).on('click touch', '.woosw-detail-rename-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $btn = $(this);
        var $nameWrap = $btn.closest('.woosw-detail-name-wrap');
        var key = $btn.data('key');
        var currentName = $btn.data('name');

        if ($nameWrap.hasClass('woosw-detail-renaming')) {
            return;
        }

        $nameWrap.addClass('woosw-detail-renaming');

        // Hide existing text nodes (keep btn hidden too)
        $nameWrap.contents().filter(function () {
            return this.nodeType === 3;
        }).hide ? null : null;

        // Wrap text in a temporary span to hide it easily
        var $textSpan = $nameWrap.find('.woosw-detail-name-text');
        if (!$textSpan.length) {
            // Replace text node with a span so we can toggle it
            $nameWrap.contents().filter(function () {
                return this.nodeType === 3 && $.trim(this.nodeValue) !== '';
            }).wrap('<span class="woosw-detail-name-text"></span>');
            $textSpan = $nameWrap.find('.woosw-detail-name-text');
        }
        $textSpan.hide();
        $btn.hide();

        var $input = $('<input>', {
            type: 'text',
            'class': 'woosw-detail-rename-input',
            val: currentName,
            maxlength: 200,
        });

        var $saveBtn = $('<button>', {
            type: 'button',
            'class': 'woosw-detail-rename-save',
            html: '&#10003;',
            title: woosw_vars.save_text || 'Save',
        });

        var $cancelBtn = $('<button>', {
            type: 'button',
            'class': 'woosw-detail-rename-cancel',
            html: '&#215;',
            title: woosw_vars.cancel_text || 'Cancel',
        });

        $nameWrap.append($input).append($saveBtn).append($cancelBtn);
        $input.trigger('focus').trigger('select');

        function cancelDetailEdit() {
            $input.remove();
            $saveBtn.remove();
            $cancelBtn.remove();
            $textSpan.show();
            $btn.show();
            $nameWrap.removeClass('woosw-detail-renaming');
        }

        function saveDetailEdit() {
            var newName = $.trim($input.val());

            if (newName === '') {
                $input.addClass('woosw-rename-error').trigger('focus');
                return;
            }

            if (newName === currentName) {
                cancelDetailEdit();
                return;
            }

            $saveBtn.prop('disabled', true);
            $cancelBtn.prop('disabled', true);
            $nameWrap.addClass('woosw-rename-saving');

            var data = {
                action: 'woosw_rename_wishlist',
                key: key,
                name: newName,
                nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_rename_wishlist'), data, function (response) {
                $nameWrap.removeClass('woosw-rename-saving');

                if (response && response.status === 1) {
                    var savedName = response.name;
                    $textSpan.text(savedName);
                    $btn.data('name', savedName);
                    currentName = savedName;

                    // Update switcher dropdown option if present
                    $('.woosw-switcher-dropdown option[data-key="' + key + '"]').each(function () {
                        var $opt = $(this);
                        var optText = $opt.text();
                        // Replace name part before ' (' count separator
                        var parenIdx = optText.lastIndexOf(' (');
                        if (parenIdx > -1) {
                            $opt.text(savedName + optText.substring(parenIdx));
                        } else {
                            $opt.text(savedName);
                        }
                    });
                } else {
                    $input.addClass('woosw-rename-error').prop('disabled', false).trigger('focus');
                    $saveBtn.prop('disabled', false);
                    $cancelBtn.prop('disabled', false);
                    return;
                }

                cancelDetailEdit();
            }).fail(function () {
                $nameWrap.removeClass('woosw-rename-saving');
                $input.addClass('woosw-rename-error').prop('disabled', false).trigger('focus');
                $saveBtn.prop('disabled', false);
                $cancelBtn.prop('disabled', false);
            });
        }

        $input.on('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveDetailEdit();
            } else if (e.key === 'Escape') {
                cancelDetailEdit();
            }
        });

        $saveBtn.on('click touch', function (e) {
            e.preventDefault();
            saveDetailEdit();
        });

        $cancelBtn.on('click touch', function (e) {
            e.preventDefault();
            cancelDetailEdit();
        });
    });

    // view wishlist
    $(document).on('click touch', '.woosw-view-wishlist', function (e) {
        e.preventDefault();
        woosw_popup_loading();

        var key = $(this).data('key');
        var data = {
            action: 'woosw_view_wishlist', key: key, nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_view_wishlist'), data, function (response) {
            woosw_manage_hide();
            $('#woosw_wishlist').removeClass('woosw-loaded').html(response);
            woosw_wishlist_show();
            woosw_popup_loaded();
        });
    });

    // menu item
    $(document).on('click touch', '.woosw-menu-item a, .woosw-menu a, .woosw-link.woosw-link-auto a', function (e) {
        if (woosw_vars.menu_action === 'open_popup') {
            e.preventDefault();

            if ($('#woosw_wishlist').hasClass('woosw-loaded')) {
                woosw_wishlist_show();
            } else {
                woosw_wishlist_load();
            }
        }
    });

    // link popup
    $(document).on('click touch', '.woosw-link.woosw-link-popup a', function (e) {
        e.preventDefault();

        if ($('#woosw_wishlist').hasClass('woosw-loaded')) {
            woosw_wishlist_show();
        } else {
            woosw_wishlist_load();
        }
    });

    // account link
    $(document).on('click touch', '.woocommerce-MyAccount-navigation-link--wishlist a', function (e) {
        if (woosw_vars.page_myaccount === 'yes_popup') {
            e.preventDefault();

            if ($('#woosw_wishlist').hasClass('woosw-loaded')) {
                woosw_wishlist_show();
            } else {
                woosw_wishlist_load();
            }
        }
    });

    // copy link
    $(document).on('click touch', '#woosw_copy_url, #woosw_copy_btn', function (e) {
        e.preventDefault();
        let $link = $('#woosw_copy_url');
        let link = $link.val();

        navigator.clipboard.writeText(link).then(function () {
            alert(woosw_vars.copied_text + ' ' + link);
        }, function () {
            alert('Failure to copy!');
        });

        $link.select();
    });

    // add note
    $(document).on('click touch', '.woosw-item--note', function () {
        if ($(this).closest('.woosw-item').find('.woosw-item--note-add').length) {
            $(this).closest('.woosw-item').find('.woosw-item--note-add').show();
            $(this).hide();
        }
    });

    $(document).on('click touch', '.woosw_add_note', function (e) {
        e.preventDefault();
        woosw_popup_loading();

        var $this = $(this);
        var key = $this.closest('.woosw-items').data('key');
        var product_id = $this.closest('.woosw-item').attr('data-id');
        var note = $this.closest('.woosw-item').find('input[type="text"]').val();
        var data = {
            action: 'woosw_add_note',
            key: key,
            product_id: product_id,
            note: woosw_html_entities(note),
            nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add_note'), data, function (response) {
            $this.closest('.woosw-item').find('.woosw-item--note').html(response).show();
            $this.closest('.woosw-item').find('.woosw-item--note-add').hide();
            woosw_popup_loaded();
        });
    });

    // search/filter products
    $(document).on('input', '.woosw-search-input', function () {
        var keyword = $(this).val().toLowerCase().trim();
        var $items = $(this).closest('.woosw-popup-content').find('.woosw-items:not(.woosw-suggested-items) .woosw-item');

        if (keyword === '') {
            $items.show();
            // show suggested section
            $(this).closest('.woosw-popup-content').find('.woosw-suggested, .woosw-suggested-items').show();
        } else {
            $items.each(function () {
                var name = ($(this).attr('data-name') || '').toLowerCase();
                var note = ($(this).attr('data-note') || '').toLowerCase();

                if (name.indexOf(keyword) > -1 || note.indexOf(keyword) > -1) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });

            // hide suggested section when searching
            $(this).closest('.woosw-popup-content').find('.woosw-suggested, .woosw-suggested-items').hide();
        }
    });

    // clear search on popup close
    $(document).on('click touch', '#woosw_wishlist .woosw-popup-close, .woosw-continue', function () {
        $('.woosw-search-input').val('').trigger('input');
    });

    // resize
    $(window).on('resize', function () {
        woosw_fix_height();
    });

    function woosw_wishlist_load() {
        var data = {
            action: 'woosw_load', nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_load'), data, function (response) {
            if (response.content != null) {
                $('#woosw_wishlist').html(response.content);
            }

            if (response.count != null) {
                if ($('#woosw_wishlist .woosw-items:not(.woosw-suggested-items) .woosw-item').length && ($('#woosw_wishlist .woosw-items:not(.woosw-suggested-items) .woosw-item').length != response.count)) {
                    woosw_change_count($('#woosw_wishlist .woosw-items:not(.woosw-suggested-items) .woosw-item').length);
                } else {
                    woosw_change_count(response.count);
                }
            }

            if (response.notice != null) {
                woosw_notice(response.notice);
            }

            $('#woosw_wishlist').addClass('woosw-loaded');

            woosw_perfect_scrollbar();
            woosw_wishlist_show();
        });
    }

    function woosw_load_count() {
        var data = {
            action: 'woosw_load_count', nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_load_count'), data, function (response) {
            if (response.count != null) {
                var count = response.count;

                woosw_change_count(count);
                $(document.body).trigger('woosw_load_count', [count]);
            }
        });
    }

    function woosw_load_list() {
        var data = {
            action: 'woosw_load_list', nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_load_list'), data, function (response) {
            if (response.list != null) {
                $('.woosw-list-ajax').replaceWith(response.list);
            }
        });
    }

    function woosw_wishlist_show() {
        $('#woosw_wishlist').addClass('woosw-show');
        woosw_fix_height();

        $(document.body).trigger('woosw_wishlist_show');
    }

    function woosw_wishlist_hide() {
        $('#woosw_wishlist').removeClass('woosw-show');
        $(document.body).trigger('woosw_wishlist_hide');
    }

    function woosw_manage_show() {
        $('#woosw_manage').addClass('woosw-show');
        $(document.body).trigger('woosw_manage_show');
    }

    function woosw_manage_hide() {
        $('#woosw_manage').removeClass('woosw-show');
        $(document.body).trigger('woosw_manage_hide');
    }

    function woosw_popup_loading() {
        $('.woosw-popup').addClass('woosw-loading');
    }

    function woosw_popup_loaded() {
        $('.woosw-popup').removeClass('woosw-loading');
    }

    function woosw_change_count(count) {
        $('#woosw_wishlist .woosw-count').html(count);
        $('.woosw-link .woosw-link-inner').attr('data-count', count);

        if (parseInt(count) > 0) {
            $('.woosw-empty').show();
        } else {
            $('.woosw-empty').hide();
        }

        if ($('.woosw-menu-item .woosw-menu-item-inner').length) {
            $('.woosw-menu-item .woosw-menu-item-inner').attr('data-count', count);
        } else {
            $('.woosw-menu-item a').html('<span class="woosw-menu-item-inner" data-count="' + count + '"><i class="woosw-icon"></i><span>' + woosw_vars.menu_text + '</span></span>');
        }

        $(document.body).trigger('woosw_change_count', [count]);
    }

    function woosw_notice(notice) {
        $('.woosw-notice').html(notice);
        woosw_notice_show();
        setTimeout(function () {
            woosw_notice_hide();
        }, 3000);
    }

    function woosw_notice_show() {
        $('#woosw_wishlist .woosw-notice').addClass('woosw-notice-show');
    }

    function woosw_notice_hide() {
        $('#woosw_wishlist .woosw-notice').removeClass('woosw-notice-show');
    }

    function woosw_perfect_scrollbar() {
        if (woosw_vars.perfect_scrollbar === 'yes') {
            jQuery('#woosw_wishlist .woosw-popup-content-mid').perfectScrollbar({theme: 'wpc'});
        }
    }

    function woosw_html_entities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function woosw_set_key(value) {
        // keep the attributes identical to the PHP cookie writer (Woosw_Helper::set_cookie)
        var attributes = {
            expires: 7,
            path: woosw_vars.cookie_path || '/',
            sameSite: woosw_vars.cookie_samesite || 'Lax',
        };

        if (woosw_vars.cookie_secure === 'yes') {
            attributes.secure = true;
        }

        if (woosw_vars.cookie_domain) {
            attributes.domain = woosw_vars.cookie_domain;
        }

        Cookies.set('woosw_key', value, attributes);
    }

    function woosw_get_key() {
        var result = [];
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var charactersLength = characters.length;

        for (var i = 0; i < 6; i++) {
            result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
        }

        return result.join('');
    }

    function woosw_fix_height() {
        // fix for center only
        jQuery('.woosw-popup-center .woosw-popup-content').height(2 * Math.floor(jQuery('.woosw-popup-center .woosw-popup-content').height() / 2) + 2);
    }

    function woosw_load_data() {
        // don't use sessionStorage anymore
        woosw_get_data();
    }

    function woosw_get_data() {
        var data = {
            action: 'woosw_get_data', nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_get_data'), data, function (response) {
            if (response) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.key, JSON.stringify(response));
                }

                if (response.fragments) {
                    woosw_refresh_fragments(response.fragments);
                }

                if (response.ids) {
                    woosw_refresh_buttons(response.ids);
                    woosw_refresh_ids(response.ids);
                }

                if (response.key && (key === null || key === undefined || key === '' || key !== response.key)) {
                    woosw_set_key(response.key);
                }

                $(document.body).trigger('woosw_data_refreshed', [response]);
            }
        });
    }

    function woosw_refresh_fragments(fragments) {
        $.each(fragments, function (key, value) {
            $(key).replaceWith(value);
        });

        $(document.body).trigger('woosw_fragments_refreshed', [fragments]);
    }

    function woosw_refresh_ids(ids) {
        added_ids = ids;
    }

    function woosw_refresh_buttons(ids) {
        $('.woosw-btn').removeClass('woosw-btn-added woosw-added');
        $('.woosw-btn:not(.woosw-btn-has-icon)').text(woosw_vars.button_text);
        $('.woosw-btn.woosw-btn-has-icon').find('.woosw-btn-icon').removeClass(woosw_vars.button_added_icon).addClass(woosw_vars.button_normal_icon);
        $('.woosw-btn.woosw-btn-has-icon').find('.woosw-btn-text').text(woosw_vars.button_text);

        $.each(ids, function (key, value) {
            $('.woosw-btn-' + key).addClass('woosw-btn-added woosw-added');
            $('.woosw-btn-' + key + ':not(.woosw-btn-has-icon)').text(woosw_vars.button_text_added);
            $('.woosw-btn-has-icon.woosw-btn-' + key).find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon).addClass(woosw_vars.button_added_icon);
            $('.woosw-btn-has-icon.woosw-btn-' + key).find('.woosw-btn-text').text(woosw_vars.button_text_added);

            if (value.parent !== undefined) {
                $('.woosw-btn-' + value.parent).addClass('woosw-btn-added woosw-added');
                $('.woosw-btn-' + value.parent + ':not(.woosw-btn-has-icon)').text(woosw_vars.button_text_added);
                $('.woosw-btn-has-icon.woosw-btn-' + value.parent).find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon).addClass(woosw_vars.button_added_icon);
                $('.woosw-btn-has-icon.woosw-btn-' + value.parent).find('.woosw-btn-text').text(woosw_vars.button_text_added);
            }
        });

        $(document.body).trigger('woosw_buttons_refreshed', [ids]);
    }

    function woosw_refresh_button_id(id) {
        $('.woosw-btn[data-id="' + id + '"]').removeClass('woosw-btn-added woosw-added');
        $('.woosw-btn[data-id="' + id + '"]:not(.woosw-btn-has-icon)').text(woosw_vars.button_text);
        $('.woosw-btn-has-icon.woosw-btn[data-id="' + id + '"]').find('.woosw-btn-icon').removeClass(woosw_vars.button_added_icon).addClass(woosw_vars.button_normal_icon);
        $('.woosw-btn-has-icon.woosw-btn[data-id="' + id + '"]').find('.woosw-btn-text').text(woosw_vars.button_text);

        $.each(added_ids, function (key) {
            if (parseInt(key) === parseInt(id)) {
                $('.woosw-btn[data-id="' + id + '"]').addClass('woosw-btn-added woosw-added');
                $('.woosw-btn[data-id="' + id + '"]:not(.woosw-btn-has-icon)').text(woosw_vars.button_text_added);
                $('.woosw-btn-has-icon.woosw-btn[data-id="' + id + '"]').find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon).addClass(woosw_vars.button_added_icon);
                $('.woosw-btn-has-icon.woosw-btn[data-id="' + id + '"]').find('.woosw-btn-text').text(woosw_vars.button_text_added);
            }
        });

        $(document.body).trigger('woosw_refresh_button_id', [id, added_ids]);
    }

    // add product to wishlist (extracted original add logic)
    function woosw_add_product($btn, id, product_name, product_image) {
        var data = {
            action: 'woosw_add', product_id: id, nonce: woosw_vars.nonce,
        };

        $btn.addClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_normal_icon + ' ' + woosw_vars.button_added_icon).addClass(woosw_vars.button_loading_icon);

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add'), data, function (response) {
            $btn.removeClass('woosw-adding').find('.woosw-btn-icon').removeClass(woosw_vars.button_loading_icon);

            if (woosw_vars.button_action === 'list') {
                if (response.content != null) {
                    $('#woosw_wishlist').html(response.content).addClass('woosw-loaded');
                }

                if (response.notice != null) {
                    woosw_notice(response.notice.replace('{name}', '<strong>' + product_name + '</strong>'));
                }

                woosw_perfect_scrollbar();
                woosw_wishlist_show();
            }

            if (woosw_vars.button_action === 'message') {
                $('#woosw_wishlist').removeClass('woosw-loaded');

                $.notiny({
                    theme: 'woosw',
                    position: woosw_vars.message_position,
                    image: product_image,
                    text: response.notice.replace('{name}', '<strong>' + product_name + '</strong>'),
                });
            }

            if (woosw_vars.button_action === 'no') {
                $('#woosw_wishlist').removeClass('woosw-loaded');
            }

            if (response.count != null) {
                woosw_change_count(response.count);
            }

            if (response.status === 1) {
                woosw_refresh_button_id(id);
            }

            if (response.data) {
                if ($storage) {
                    sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                }

                if (response.data.fragments) {
                    woosw_refresh_fragments(response.data.fragments);
                }

                if (response.data.ids) {
                    woosw_refresh_buttons(response.data.ids);
                    woosw_refresh_ids(response.data.ids);
                }
            }

            $(document.body).trigger('woosw_add', [id]);
        });
    }

    // build choose wishlist popup content
    function woosw_choose_build(wishlists, product_id, product_name, product_image, can_add_more) {
        var html = '<div class="woosw-popup-inner">';
        html += '<div class="woosw-popup-content">';
        html += '<div class="woosw-popup-content-top">';
        html += '<span class="woosw-name">' + woosw_vars.choose_wishlist_text + '</span>';
        html += '<span class="woosw-popup-close"></span>';
        html += '</div>';
        html += '<div class="woosw-popup-content-mid">';
        html += '<div class="woosw-choose-list">';

        $.each(wishlists, function (i, wl) {
            var active_class = wl.is_default ? ' woosw-choose-item-default' : '';
            html += '<div class="woosw-choose-item' + active_class + '" data-key="' + wl.key + '">';
            html += '<div class="woosw-choose-item-info">';
            var displayName = wl.name;
            html += '<span class="woosw-choose-item-name">' + displayName + '</span>';
            html += '<span class="woosw-choose-item-count">(' + wl.count + ')</span>';

            html += '<div class="woosw-item--badges">';
            if (wl.type === 'primary') {
                html += '<small class="woosw-badge">' + (woosw_vars.badge_primary_text || 'Primary') + '</small>';
            } else if (wl.is_collab) {
                html += '<small class="woosw-badge">' + (woosw_vars.badge_followed_text || 'Followed') + '</small>';
                html += '<small class="woosw-badge">' + (woosw_vars.badge_collabable_text || 'Collabable') + '</small>';
            }
            
            if (wl.is_default) {
                html += '<small class="woosw-badge woosw-badge-default">' + (woosw_vars.badge_default_text || 'Default') + '</small>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';

        if (can_add_more) {
            html += '<div class="woosw-choose-add-new">';
            html += '<input type="text" class="woosw-choose-new-name" maxlength="200" placeholder="' + (woosw_vars.placeholder_name || 'New Wishlist') + '" />';
            html += '<button type="button" class="woosw-choose-new-save">' + (woosw_vars.add_wishlist_btn_text || 'Add') + '</button>';
            html += '</div>';
        }

        html += '</div>';
        html += '</div>';
        html += '</div>';

        $('#woosw_choose').html(html)
            .data('product_id', product_id)
            .data('product_name', product_name)
            .data('product_image', product_image);
    }

    // show choose wishlist popup
    function woosw_choose_show() {
        $('#woosw_choose').addClass('woosw-show');
        $(document.body).trigger('woosw_choose_show');
    }

    // hide choose wishlist popup
    function woosw_choose_hide() {
        $('#woosw_choose').removeClass('woosw-show');
        $(document.body).trigger('woosw_choose_hide');
    }

    // collabable wishlist toggle
    $(document).on('change', '.woosw-collabable-checkbox', function () {
        var $this = $(this);
        var key = $this.data('key');
        var is_checked = $this.is(':checked');
        var $searchWrap = $('.woosw-search-product-wrap[data-key="' + key + '"]');
        var data = {
            action: 'woosw_toggle_collabable',
            key: key,
            collabable: is_checked ? 'yes' : 'no',
            nonce: woosw_vars.nonce,
        };

        $this.prop('disabled', true);

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_toggle_collabable'), data, function (response) {
            $this.prop('disabled', false);

            if (response.status === 1) {
                if (response.collabable === 1) {
                    $searchWrap.removeClass('woosw-hidden');
                } else {
                    $searchWrap.addClass('woosw-hidden');
                    $searchWrap.find('.woosw-search-product-results').empty().removeClass('woosw-active');
                    $searchWrap.find('.woosw-search-product-input').val('');
                    $searchWrap.removeClass('woosw-has-text woosw-loading');
                }
            } else {
                $this.prop('checked', !is_checked);
            }

            if (response.notice != null) {
                woosw_notice(response.notice);
            }
        }).fail(function () {
            $this.prop('disabled', false);
            $this.prop('checked', !is_checked);
        });
    });

    // collabable product search debounce timer
    var woosw_collab_search_timer = null;

    $(document).on('input', '.woosw-search-product-input', function () {
        var $input = $(this);
        var $wrap = $input.closest('.woosw-search-product-wrap');
        var $results = $wrap.find('.woosw-search-product-results');
        var key = $wrap.data('key');
        var keyword = $input.val().trim();

        clearTimeout(woosw_collab_search_timer);

        if (keyword.length === 0) {
            $wrap.removeClass('woosw-has-text woosw-loading');
            $results.empty().removeClass('woosw-active');
            return;
        }

        $wrap.addClass('woosw-has-text');

        if (keyword.length < 2) {
            $results.empty().removeClass('woosw-active');
            return;
        }

        $wrap.addClass('woosw-loading');

        woosw_collab_search_timer = setTimeout(function () {
            var data = {
                action: 'woosw_search_products',
                keyword: keyword,
                key: key,
                nonce: woosw_vars.nonce,
            };

            $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_search_products'), data, function (response) {
                $wrap.removeClass('woosw-loading');

                if (response.success && response.html) {
                    $results.html(response.html).addClass('woosw-active');
                } else {
                    $results.empty().removeClass('woosw-active');
                }
            }).fail(function () {
                $wrap.removeClass('woosw-loading');
            });
        }, 300);
    });

    // clear search input
    $(document).on('click touch', '.woosw-search-product-clear', function () {
        var $wrap = $(this).closest('.woosw-search-product-wrap');
        $wrap.find('.woosw-search-product-input').val('').trigger('input');
    });

    // close search dropdown on click outside
    $(document).on('click touch', function (e) {
        if (!$(e.target).closest('.woosw-search-product-wrap').length) {
            $('.woosw-search-product-results').removeClass('woosw-active');
        }
    });

    // reopen search dropdown on focus if has results
    $(document).on('focus', '.woosw-search-product-input', function () {
        var $wrap = $(this).closest('.woosw-search-product-wrap');
        var $results = $wrap.find('.woosw-search-product-results');
        if ($results.children().length > 0) {
            $results.addClass('woosw-active');
        }
    });

    // add product to collabable wishlist from search results
    $(document).on('click touch', '.woosw-search-add-btn:not(.is-added)', function (e) {
        var $btn = $(this);
        var product_id = $btn.data('id');
        var key = $btn.data('key');
        var $wrap = $btn.closest('.woosw-search-product-wrap');
        var data = {
            action: 'woosw_add',
            product_id: product_id,
            key: key,
            nonce: woosw_vars.nonce,
        };

        $btn.addClass('woosw-adding');

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', 'woosw_add'), data, function (response) {
            $btn.removeClass('woosw-adding');

            if (response.status === 1) {
                $btn.addClass('is-added').prop('disabled', true).html('<span class="woosw-search-add-icon">&#10003;</span> ' + (woosw_vars.added_text || 'Added'));

                if (response.notice != null) {
                    woosw_notice(response.notice);
                }

                if (response.count != null) {
                    woosw_change_count(response.count);
                }

                if (response.data) {
                    if ($storage) {
                        sessionStorage.setItem('woosw_data_' + response.data.key, JSON.stringify(response.data));
                    }

                    if (response.data.fragments) {
                        woosw_refresh_fragments(response.data.fragments);
                    }

                    if (response.data.ids) {
                        woosw_refresh_buttons(response.data.ids);
                        woosw_refresh_ids(response.data.ids);
                    }
                }

                // Update items in wishlist table on page
                if (response.items != null) {
                    var $list = $('.woosw-list[data-key="' + key + '"]');
                    if ($list.length) {
                        var $existingTable = $list.find('.woosw-items');
                        var $emptyMsg = $list.find('.woosw-popup-content-mid-message');

                        if ($existingTable.length) {
                            $existingTable.replaceWith(response.items);
                        } else if ($emptyMsg.length) {
                            $emptyMsg.replaceWith(response.items);
                        } else {
                            $wrap.after(response.items);
                        }
                    }
                }

                $(document.body).trigger('woosw_add', [product_id]);
            } else if (response.notice != null) {
                woosw_notice(response.notice);
            }
        }).fail(function () {
            $btn.removeClass('woosw-adding');
        });

        e.preventDefault();
    });

    // show notice next to collaboration button
    function woosw_show_collab_notice($btn, message, type) {
        if (!message) {
            return;
        }

        // Remove any existing notice next to this button
        var $existingNotice = $btn.siblings('.woosw-add-collab-notice');
        if ($existingNotice.length) {
            var existingTimer = $existingNotice.data('notice-timer');
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            $existingNotice.remove();
        }

        var noticeClass = (type === 'success') ? 'woosw-notice-success' : 'woosw-notice-error';
        var $notice = $('<span class="woosw-add-collab-notice ' + noticeClass + '">' + message + '</span>');

        $btn.after($notice);

        // Auto fade out and remove notice after 3.5 seconds
        var timer = setTimeout(function () {
            $notice.addClass('woosw-notice-fadeout');
            setTimeout(function () {
                $notice.remove();
            }, 300);
        }, 3500);

        $notice.data('notice-timer', timer);
    }

    // add or remove collaboration wishlist from user's wishlists
    $(document).on('click touch', '.woosw-add-collab-btn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var key = $btn.data('key');

        if (!key || $btn.hasClass('woosw-loading')) {
            return;
        }

        $btn.addClass('woosw-loading');

        var isAdded = $btn.hasClass('is-added');
        var action = isAdded ? 'woosw_remove_collab_wishlist' : 'woosw_add_collab_wishlist';

        var data = {
            action: action,
            key: key,
            nonce: woosw_vars.nonce,
        };

        $.post(woosw_vars.wc_ajax_url.toString().replace('%%endpoint%%', action), data, function (response) {
            $btn.removeClass('woosw-loading');

            if (response.status === 1) {
                if (isAdded) {
                    $btn.removeClass('is-added').html('<span class="woosw-add-collab-icon">+</span> ' + (woosw_vars.add_to_my_wishlists_text || 'Follow'));
                } else {
                    $btn.addClass('is-added').html('<span class="woosw-add-collab-icon">&#215;</span> ' + (woosw_vars.remove_from_my_wishlists_text || 'Unfollow'));
                }

                if (response.notice != null) {
                    woosw_show_collab_notice($btn, response.notice, 'success');
                }
            } else {
                if (response.notice != null) {
                    woosw_show_collab_notice($btn, response.notice, 'error');
                }
            }

            if (response.notice != null) {
                woosw_notice(response.notice);
            }
        }).fail(function () {
            $btn.removeClass('woosw-loading');
            woosw_show_collab_notice($btn, 'An error occurred. Please try again.', 'error');
        });
    });
})(jQuery);