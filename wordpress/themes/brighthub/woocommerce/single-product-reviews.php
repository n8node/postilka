<?php
/**
 * Display single product reviews (comments)
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/single-product-reviews.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see     https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 20.0.0
 */

defined( 'ABSPATH' ) || exit;

global $product;

$comment_post = brighthub()->get_theme_opt( 'comment_post', false );
if ( post_password_required() || ! $comment_post || ! comments_open() ) {
    return;
}

$commenter = wp_get_current_commenter();
?>
<div id="reviews" class="woocommerce-Reviews">
    <div id="comments" class="pxl-comments">
        <?php if ( have_comments() ) : ?>
            <div class="pxl-comments__wrap">
                <h3 class="pxl-comments__title">
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/img/speech.png' ) ?>" title="<?php esc_attr_e('Comments', 'brighthub'); ?>" loading="lazy" />
                    <?php
                    $count = get_comments_number();
                    echo ( 1 === $count )
                        ? esc_html__( '1 Comment', 'brighthub' )
                        : esc_html( $count . ' Comments' );
                    ?>
                </h3>
                <?php the_comments_navigation(); ?>
                <ul class="pxl-comments__list">
                    <?php
                    wp_list_comments( array(
                        'style'      => 'ul',
                        'short_ping' => true,
                        'callback'   => 'brighthub_comment_list',
                        'max_depth'  => 3,
                    ) );
                    ?>
                </ul>
                <?php the_comments_navigation(); ?>
                <?php if ( ! comments_open() ) : ?>
                    <p class="pxl-comments__no-comments"><?php esc_html_e( 'Comments are closed.', 'brighthub' ); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <?php
        $args = array(
            'id_form'           => 'commentform',
            'id_submit'         => 'submit',
            'class_submit'      => 'btn btn-primary',
            'title_reply'       => esc_html__( 'Add Your Voice to the Conversation', 'brighthub' ),
            'title_reply_to'    => esc_html__( 'Add Your Voice to the Conversation To ', 'brighthub' ) . '%s',
            'cancel_reply_link' => esc_html__( 'Cancel Comment', 'brighthub' ),
            'submit_button'     => '<button name="%1$s" type="submit" id="%2$s" class="%3$s"><span class="pxl-comments__btn-text">%4$s</span></button>',
            'comment_notes_before' => '<p class="comment-notes">' . esc_html__( 'We\'d love to hear your thoughts. Keep it constructive, clear, and kind. Your email will never be shared.', 'brighthub' ) . '</p>',
            'comment_notes_after' => '<div class="comment-form__rating">
                    <label for="rating">' . esc_html__( 'Your Rating', 'brighthub' ) . '</label>
                    <select name="rating" id="rating" required>
                        <option value="">' . esc_html__( 'Rate…', 'brighthub' ) . '</option>
                        <option value="5">' . esc_html__( 'Perfect', 'brighthub' ) . '</option>
                        <option value="4">' . esc_html__( 'Good', 'brighthub' ) . '</option>
                        <option value="3">' . esc_html__( 'Average', 'brighthub' ) . '</option>
                        <option value="2">' . esc_html__( 'Not that bad', 'brighthub' ) . '</option>
                        <option value="1">' . esc_html__( 'Very Poor', 'brighthub' ) . '</option>
                    </select>
                </div>',
            'fields'            => apply_filters( 'comment_form_default_fields', array(
                'author' => '<div class="comment-form__input-wrap"><div class="comment-form__author"><label for="author">' . esc_html__( 'Your name', 'brighthub' ) . '</label><input id="author" name="author" type="text" value="' . esc_attr( $commenter['comment_author'] ) . '" size="30" placeholder="' . esc_attr__( 'Full name', 'brighthub' ) . '"/></div>',
                'email'  => '<div class="comment-form__email"><label for="email">' . esc_html__( 'Email address', 'brighthub' ) . '</label><input id="email" name="email" type="email" value="' . esc_attr( $commenter['comment_author_email'] ) . '" size="30" placeholder="' . esc_attr__( 'Email Address', 'brighthub' ) . '"/></div></div>',
            ) ),
            'comment_field'     => 
                '<div class="comment-form__comment">
                    <label for="comment">' . esc_html__( 'Your comment', 'brighthub' ) . '</label>
                    <textarea id="comment" name="comment" cols="45" rows="8" placeholder="' . esc_attr__( 'Write your comment...', 'brighthub' ) . '" aria-required="true"></textarea>
                </div>',
        );

        comment_form( $args );
        ?>
    </div>
</div>