<?php
/**
 * @package Case-Themes
 */
$comment_post = brighthub()->get_theme_opt('comment_post', false);
if ( post_password_required() || !$comment_post ) {
    return;
    } ?>

    <div id="comments" class="pxl-comments">

        <?php
        if ( have_comments() ) : ?>
            <div class="pxl-comments__wrap">

                <h3 class="pxl-comments__title">
                    <img src="<?php echo esc_url(get_template_directory_uri(). '/assets/img/speech.png' ) ?>" loading="lazy" title="<?php esc_attr_e('Comments', 'brighthub'); ?>" />
                    <?php
                        $comment_count = get_comments_number();
                        if ( 1 === intval($comment_count) ) {
                            echo esc_html__( '1 Comment', 'brighthub' );
                        } else {
                            echo esc_attr( $comment_count ).' '.esc_html__('Comments', 'brighthub');
                        }
                    ?>
                </h3>

                <?php the_comments_navigation(); ?>

                <ul class="pxl-comments__list">
                    <?php
                        wp_list_comments( array(
                            'style'      => 'ul',
                            'short_ping' => true,
                            'callback'   => 'brighthub_comment_list',
                            'max_depth'  => 3
                        ) );
                    ?>
                </ul>

                <?php the_comments_navigation(); ?>
            </div>
            <?php if ( ! comments_open() ) : ?>
                <p class="pxl-comments__no-comments"><?php esc_html_e( 'Comments are closed.', 'brighthub' ); ?></p>
            <?php
            endif;

        endif;

        $args = array(
            'id_form'           => 'commentform',
            'id_submit'         => 'submit',
            'class_submit'      => 'btn btn-primary',
            'title_reply'       => esc_html__( 'Add Your Voice to the Conversation', 'brighthub'),
            'title_reply_to'    => esc_html__( 'Add Your Voice to the Conversation To ', 'brighthub') . '%s',
            'cancel_reply_link' => esc_html__( 'Cancel Comment', 'brighthub'),
            'submit_button'     => '<button name="%1$s" type="submit" id="%2$s" class="%3$s"><span class="pxl-comments__btn-text">%4$s</span></button>',
            'comment_notes_before' => '<p class="comment-notes">' . esc_html__('We\'d love to hear your thoughts. Keep it constructive, clear, and kind. Your email will never be shared.', 'brighthub') . '</p>',
            'fields' => apply_filters('comment_form_default_fields', array(
                'author' =>
                '<div class="comment-form__input-wrap">'.
                '<div class="comment-form__author">'.
                    '<label for="author">'.esc_html__('Your name', 'brighthub').'</label>'.
                        '<input id="author" name="author" type="text" value="' . esc_attr($commenter['comment_author']) .
                        '" size="30" placeholder="'.esc_attr__('Full name', 'brighthub').'"/>'.
                '</div>',
                
                'email' =>
                '<div class="comment-form__email">'.
                    '<label for="email">'.esc_html__('Email address', 'brighthub').'</label>'.
                        '<input id="email" name="email" type="text" value="' . esc_attr($commenter['comment_author_email']) .
                        '" size="30" placeholder="'.esc_attr__('Email Address', 'brighthub').'"/>'.
                    '</div>'.
                '</div>',
            )),
            'comment_field' =>
                '<div class="comment-form__comment">'.
                    '<label for="comment">'.esc_html__('Your comment', 'brighthub').'</label>'.
                    '<textarea id="comment" name="comment" cols="45" rows="8" placeholder="'.esc_attr__('Write your comment...', 'brighthub').'" aria-required="true"></textarea>'.
                '</div>',
        );
        
    comment_form($args); ?>
</div>