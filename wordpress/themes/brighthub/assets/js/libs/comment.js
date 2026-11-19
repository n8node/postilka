(function ($) {
  function createCommentHTML(data, reply) {
    var html =
      '<li class="comment pxl-comments__item depth-' +
      (parseInt(reply) + 1) +
      '" id="comment-' +
      data.comment_id +
      '">';
    html += '<div id="div-comment-' + data.comment_id + '" class="pxl-comments__item-body">';
    html += '<div class="pxl-comments__item-inner">';

    html += '<div class="pxl-comment__action-hide">';
    html +=
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">';
    html +=
      '<path d="M8.00039 9.59844C8.88405 9.59844 9.60039 8.88209 9.60039 7.99844C9.60039 7.11478 8.88405 6.39844 8.00039 6.39844C7.11673 6.39844 6.40039 7.11478 6.40039 7.99844C6.40039 8.88209 7.11673 9.59844 8.00039 9.59844Z" fill="#181D27"></path>';
    html +=
      '<path d="M3.73281 9.59844C4.61647 9.59844 5.33281 8.88209 5.33281 7.99844C5.33281 7.11478 4.61647 6.39844 3.73281 6.39844C2.84916 6.39844 2.13281 7.11478 2.13281 7.99844C2.13281 8.88209 2.84916 9.59844 3.73281 9.59844Z" fill="#181D27"></path>';
    html +=
      '<path d="M12.266 9.59844C13.1497 9.59844 13.866 8.88209 13.866 7.99844C13.866 7.11478 13.1497 6.39844 12.266 6.39844C11.3824 6.39844 10.666 7.11478 10.666 7.99844C10.666 8.88209 11.3824 9.59844 12.266 9.59844Z" fill="#181D27"></path>';
    html += "</svg>";
    html += '<ul class="pxl-comment__opt">';
    if (pxl_ajax_object.is_admin) {
      html += "<li>Hide</li>";
      html +=
        '<li class="pxl-comment__remove" data-comment-id="' + data.comment_id + '">Remove</li>';
    } else {
      html += "<li>Hide</li>";
    }
    html += "</ul>";
    html += "</div>";

    html += '<div class="pxl-comments__avatar">';
    html += data.avatar;
    html += '<h4 class="pxl-comments__item-title">' + data.author + "</h4>";
    html += '<span class="pxl-comments__item-time">' + data.time + "</span>";
    html += "</div>";

    html += '<div class="pxl-comments__item-cnt">';
    html += '<div class="pxl-comments__item-text"><p>' + data.content + "</p></div>";
    html += '<div class="pxl-comments__actions">';
    html += '<div class="pxl-comments__like" data-comment-id="' + data.comment_id + '">';
    html += '<img src="' + pxl_ajax_object.template_directory + '/assets/img/like.png" alt="Like">';
    html += '<span class="pxl-comments__like-count">0</span>';
    html += "</div>";
    if (reply < 3) {
      html +=
        '<div class="pxl-comments__item-reply" data-comment-id="' +
        data.comment_id +
        '">Reply</div>';
    }
    html += "</div>";

    html += '<div class="pxl-comments__reply" style="display: none;">';
    html +=
      '<div class="pxl-comments__reply-cancel"><svg version="1.1" id="fi_748122" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512.001 512.001" style="enable-background:new 0 0 512.001 512.001;" xml:space="preserve"><g><g><path d="M284.286,256.002L506.143,34.144c7.811-7.811,7.811-20.475,0-28.285c-7.811-7.81-20.475-7.811-28.285,0L256,227.717 L34.143,5.859c-7.811-7.811-20.475-7.811-28.285,0c-7.81,7.811-7.811,20.475,0,28.285l221.857,221.857L5.858,477.859 c-7.811,7.811-7.811,20.475,0,28.285c3.905,3.905,9.024,5.857,14.143,5.857c5.119,0,10.237-1.952,14.143-5.857L256,284.287 l221.857,221.857c3.905,3.905,9.024,5.857,14.143,5.857s10.237-1.952,14.143-5.857c7.811-7.811,7.811-20.475,0-28.285 L284.286,256.002z"></path></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg></div>';
    html += '<div class="pxl-comments__reply-img">';

    if (pxl_ajax_object.is_logged_in === "1") {
      html += '<img src="' + pxl_ajax_object.user_avatar + '" alt="User Avatar">';
    } else {
      html +=
        '<img src="' +
        pxl_ajax_object.template_directory +
        '/assets/img/df-avt.jpg" alt="Default Avatar">';
    }

    html += "</div>";
    html += '<form action="javascript:void(0);" method="post" class="pxl-comments__reply-form">';
    html += '<input type="hidden" name="action" value="post_comment_reply">';
    html += '<input type="hidden" name="comment_parent_id" class="comment-parent-id" value="">';
    html += '<input type="hidden" name="post_id" value="' + data.post_id + '">';
    html += '<input type="hidden" id="nonce" name="nonce" value="' + pxl_ajax_object.nonce + '">';

    if (pxl_ajax_object.is_logged_in === "0") {
      html += '<div class="pxl-comments__reply-fields">';
      html += '<input type="text" name="comment_author" placeholder="Your name" required>';
      html += '<input type="email" name="comment_author_email" placeholder="Your email" required>';
      html += "</div>";
    }

    html += '<textarea name="comment_content" placeholder="Message" required></textarea>';
    html += '<button type="submit">';
    html +=
      '<svg id="fi_2983788" enable-background="new 0 0 512.005 512.005" height="512" viewBox="0 0 512.005 512.005" width="512" xmlns="http://www.w3.org/2000/svg">';
    html +=
      '<g><path d="m511.658 51.675c2.496-11.619-8.895-21.416-20.007-17.176l-482 184c-5.801 2.215-9.638 7.775-9.65 13.984-.012 6.21 3.803 11.785 9.596 14.022l135.403 52.295v164.713c0 6.948 4.771 12.986 11.531 14.593 6.715 1.597 13.717-1.598 16.865-7.843l56.001-111.128 136.664 101.423c8.313 6.17 20.262 2.246 23.287-7.669 127.599-418.357 122.083-400.163 122.31-401.214zm-118.981 52.718-234.803 167.219-101.028-39.018zm-217.677 191.852 204.668-145.757c-176.114 185.79-166.916 176.011-167.684 177.045-1.141 1.535 1.985-4.448-36.984 72.882zm191.858 127.546-120.296-89.276 217.511-229.462z"></path></g>';
    html += "</svg>";
    html += "</button>";
    html += "</form>";
    html += "</div>";

    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</li>";

    return html;
  }

  function handleLikeClick() {
    $(document).on("click", ".pxl-comments__like", function (e) {
      e.preventDefault();

      var $this = $(this),
        commentId = $this.data("comment-id"),
        likeCount = $this.find(".pxl-comments__like-count"),
        original = parseInt(likeCount.text(), 10) || 0;

      $this.addClass("liking");

      $.post(pxl_ajax_object.ajax_url, {
        action: "mellea_comment_like",
        comment_id: commentId,
        nonce_like: pxl_ajax_object.nonce_like
      })
        .done(function (response) {
          if ($.isNumeric(response)) {
            likeCount.text(response);
          }
        })
        .fail(function () {
          likeCount.text(original);
        })
        .always(function () {
          $this.removeClass("liking");
        });
    });
  }

  function handleReplyClick() {
    $(".pxl-comments__item-reply").on("click", function (e) {
      e.preventDefault();

      var commentId = $(this).data("comment-id");

      var commentItem = $("#comment-" + commentId);

      $(".pxl-comments__reply").hide();

      var replyForm = commentItem
        .children(".pxl-comments__item-body")
        .find(".pxl-comments__reply")
        .first();

      if (replyForm.length === 0) {
        replyForm = commentItem
          .find(".pxl-comments__item-inner")
          .find(".pxl-comments__reply")
          .first();
      }

      if (replyForm.length === 0) {
        replyForm = commentItem
          .find(".pxl-comments__item-cnt")
          .find(".pxl-comments__reply")
          .first();
      }

      if (replyForm.length > 0) {
        replyForm.find(".comment-parent-id").val(commentId);

        replyForm.show();
      } else {
        console.error("Reply form not found for comment", commentId);
      }
    });
  }

  function ensureGuestReplyFields() {
    if (pxl_ajax_object.is_logged_in === "0") {
      $(".pxl-comments__reply-form").each(function () {
        var form = $(this);
        if (form.find('input[name="comment_author"]').length === 0) {
          var contentInput = form.find('textarea[name="comment_content"]');
          var fieldsContainer = $('<div class="pxl-comments__reply-fields"></div>');
          fieldsContainer.append('<input type="text" name="comment_author" placeholder="Your name" required>');
          fieldsContainer.append('<input type="email" name="comment_author_email" placeholder="Your email" required>');
          contentInput.before(fieldsContainer);
        }
      });
      $(".pxl-comments__reply-img img").attr(
        "src",
        pxl_ajax_object.template_directory + "/assets/img/df-avt.jpg"
      );
    }
  }
  

  function handleFormSubmit() {
    $(document).on("submit", ".pxl-comments__reply-form", function (e) {
      e.preventDefault();
      e.stopPropagation();
  
      var form = $(this);
      var commentContent = form.find('textarea[name="comment_content"]').val();
      var postId = form.find('input[name="post_id"]').val();
      var commentParentId = form.find('input[name="comment_parent_id"]').val();
  
      if (!commentContent.trim()) {
        return false;
      }
  
      var formData = {
        action: "post_comment_reply",
        post_id: postId,
        comment_parent_id: commentParentId,
        comment_content: commentContent,
        nonce: form.find('input[name="nonce"]').val()
      };
  
      if (pxl_ajax_object.is_logged_in === "0") {
        formData.comment_author = form.find('input[name="comment_author"]').val();
        formData.comment_author_email = form.find('input[name="comment_author_email"]').val();
  
        if (!formData.comment_author || !formData.comment_author_email) {
          alert("Please enter your name and email.");
          return false;
        }
      }
  
      var submitButton = form.find('button[type="submit"]');
      submitButton.prop("disabled", true);
  
      var loadingIndicator = $(`<div class="comment-loading" style="display: flex; align-items: end; justify-content: center;">
        Sending <svg width="20" height="6" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg" fill="black" style="margin: 0 0 5px 0px;">
          <circle cx="15" cy="10" r="5"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="1s" repeatCount="indefinite" /></circle>
          <circle cx="50" cy="10" r="5"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.2;0.4;0.8;1" dur="1s" repeatCount="indefinite" /></circle>
          <circle cx="85" cy="10" r="5"><animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="1s" repeatCount="indefinite" /></circle>
        </svg>
      </div>`);
      form.after(loadingIndicator);
  
      var parentComment = $("#comment-" + commentParentId);
  
      $.ajax({
        url: pxl_ajax_object.ajax_url,
        type: "POST",
        data: formData,
        success: function (response) {
          loadingIndicator.remove();
  
          if (response.success) {
            form.find('textarea[name="comment_content"]').val("");
            if (pxl_ajax_object.is_logged_in === "0") {
              form.find('input[name="comment_author"]').val("");
              form.find('input[name="comment_author_email"]').val("");
            }
  
            form.closest(".pxl-comments__reply").hide();
  
            var parentId = response.data.parent_id;
            parentComment = $("#comment-" + parentId);
  
            var childrenList = parentComment.children("ul.children");
            if (childrenList.length === 0) {
              parentComment.append('<ul class="children"></ul>');
              childrenList = parentComment.children("ul.children");
            }
  
            var parentDepthMatch = parentComment.attr("class") ? parentComment.attr("class").match(/depth-(\d+)/) : null;
            var depth = 1;
            if (parentDepthMatch && parentDepthMatch[1]) {
              depth = parseInt(parentDepthMatch[1], 10) + 1;
            }
  
            var newCommentHtml = createCommentHTML(response.data, depth >= 3 ? 3 : depth);
            childrenList.append(newCommentHtml);
  
            initEvents();
            ensureGuestReplyFields();
  
            showNotification("Comment submitted successfully.", "success");
          } else {
            showNotification(response.data || "An error occurred", "error");
          }
        },
        error: function (xhr, status, error) {
          loadingIndicator.remove();
          if (xhr.status === 500) {
            showNotification("Server error. Your comment might have been saved.", "error");
  
            form.find('textarea[name="comment_content"]').val("");
            if (pxl_ajax_object.is_logged_in === "0") {
              form.find('input[name="comment_author"]').val("");
              form.find('input[name="comment_author_email"]').val("");
            }
  
            form.closest(".pxl-comments__reply").hide();
            var reloadBtn = $('<button class="reload-comments">Refresh to see your comment</button>');
            form.after(reloadBtn);
            reloadBtn.on("click", function () {
              location.reload();
            });
          } else {
            showNotification("An error occurred. Please try again.", "error");
          }
        },
        complete: function () {
          submitButton.prop("disabled", false);
        }
      });
  
      return false;
    });
  }
  

  function handleRemoveComment() {
    $(".pxl-comment__remove").on("click", function () {
      if (!confirm("Are you sure you want to remove this comment?")) {
        return false;
      }

      var commentId = $(this).data("comment-id");
      var commentItem = $("#comment-" + commentId);
      commentItem.css("opacity", "0.5");

      $.ajax({
        url: pxl_ajax_object.ajax_url,
        type: "POST",
        data: {
          action: "remove_comment",
          comment_id: commentId,
          nonce: pxl_ajax_object.nonce
        },
        success: function (response) {
          if (response.success) {
            commentItem.fadeOut(0, function () {
              if (commentItem.find("ul.children").length > 0) {
                commentItem.find("ul.children").remove();
              }

              var parentUl = commentItem.parent("ul.children");
              if (parentUl.length > 0 && parentUl.children().length === 1) {
                parentUl.remove();
              } else {
                commentItem.remove();
              }
            });

            var commentCount = $(".comment-count");
            if (commentCount.length > 0) {
              var currentCount = parseInt(commentCount.text());
              if (!isNaN(currentCount)) {
                commentCount.text(currentCount - 1);
              }
            }

            showNotification("Comment removed successfully.", "success");
          } else {
            commentItem.css("opacity", "1");
            showNotification(response.data || "Failed to remove comment.", "error");
          }
        },
        error: function (xhr, status, error) {
          console.error("AJAX Error:", status, error);
          commentItem.css("opacity", "1");
          showNotification("An error occurred while removing the comment.", "error");
        }
      });
    });
  }

  function showNotification(message, type) {
    $(".pxl-notification").remove();

    var notification = $(
      '<div class="pxl-notification pxl-notification--' + type + '">' + message + "</div>"
    );
    $("body").append(notification);

    notification
      .fadeIn()
      .delay(3000)
      .fadeOut(function () {
        $(this).remove();
      });
  }

  function initEvents() {
    $(".pxl-comments__item-reply").off("click");
    $(".pxl-comment__remove").off("click");
    $(".pxl-comment__hide").off("click");

    handleReplyClick();
    handleRemoveComment();
    handleLikeClick();
    handleCommentFormSubmit();

    $(".pxl-comment__hide").on("click", function () {
      var commentItem = $(this).closest(".pxl-comments__item");
      commentItem.find(".pxl-comments__item-cnt").slideToggle();
    });
  }
  function createNewCommentHTML(data) {
    var html = '<li class="comment pxl-comments__item" id="comment-' + data.comment_id + '">';
    html += '<div id="div-comment-' + data.comment_id + '" class="pxl-comments__item-body">';
    html += '<div class="pxl-comments__item-inner">';

    html += '<div class="pxl-comment__action-hide">';
    html +=
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">';
    html +=
      '<path d="M8.00039 9.59844C8.88405 9.59844 9.60039 8.88209 9.60039 7.99844C9.60039 7.11478 8.88405 6.39844 8.00039 6.39844C7.11673 6.39844 6.40039 7.11478 6.40039 7.99844C6.40039 8.88209 7.11673 9.59844 8.00039 9.59844Z" fill="#181D27"></path>';
    html +=
      '<path d="M3.73281 9.59844C4.61647 9.59844 5.33281 8.88209 5.33281 7.99844C5.33281 7.11478 4.61647 6.39844 3.73281 6.39844C2.84916 6.39844 2.13281 7.11478 2.13281 7.99844C2.13281 8.88209 2.84916 9.59844 3.73281 9.59844Z" fill="#181D27"></path>';
    html +=
      '<path d="M12.266 9.59844C13.1497 9.59844 13.866 8.88209 13.866 7.99844C13.866 7.11478 13.1497 6.39844 12.266 6.39844C11.3824 6.39844 10.666 7.11478 10.666 7.99844C10.666 8.88209 11.3824 9.59844 12.266 9.59844Z" fill="#181D27"></path>';
    html += "</svg>";
    html += '<ul class="pxl-comment__opt">';
    if (pxl_ajax_object.is_admin) {
      html += '<li class="pxl-comment__hide">Hide</li>';
      html +=
        '<li class="pxl-comment__remove" data-comment-id="' + data.comment_id + '">Remove</li>';
    } else {
      html += '<li class="pxl-comment__hide">Hide</li>';
    }
    html += "</ul>";
    html += "</div>";

    html += '<div class="pxl-comments__avatar">';
    html += data.avatar;
    html += '<h4 class="pxl-comments__item-title">' + data.author + "</h4>";
    html += '<span class="pxl-comments__item-time">' + data.time + "</span>";
    html += "</div>";

    html += '<div class="pxl-comments__item-cnt">';
    if (data.rating) {
      html += '<div class="pxl-comment__rating">';
      for (var i = 0; i < data.rating; i++) {
        html += "★";
      }
      html += "</div>";
    }
    html += '<div class="pxl-comments__item-text"><p>' + data.content + "</p></div>";
    html += '<div class="pxl-comments__actions">';
    html += '<div class="pxl-comments__like" data-comment-id="' + data.comment_id + '">';
    html += '<img src="' + pxl_ajax_object.template_directory + '/assets/img/like.png" alt="Like">';
    html += '<span class="pxl-comments__like-count">0</span>';
    html += "</div>";
    html +=
      '<div class="pxl-comments__item-reply" data-comment-id="' + data.comment_id + '">Reply</div>';
    html += "</div>";

    html += '<div class="pxl-comments__reply" style="display: none;">';
    html += '<div class="pxl-comments__reply-cancel">';
    html += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.001 512.001">';
    html +=
      '<path d="M284.286,256.002L506.143,34.144c7.811-7.811,7.811-20.475,0-28.285c-7.811-7.81-20.475-7.811-28.285,0L256,227.717 L34.143,5.859c-7.811-7.811-20.475-7.811-28.285,0c-7.81,7.811-7.811,20.475,0,28.285l221.857,221.857L5.858,477.859 c-7.811,7.811-7.811,20.475,0,28.285c3.905,3.905,9.024,5.857,14.143,5.857c5.119,0,10.237-1.952,14.143-5.857L256,284.287 l221.857,221.857c3.905,3.905,9.024,5.857,14.143,5.857s10.237-1.952,14.143-5.857c7.811-7.811,7.811-20.475,0-28.285 L284.286,256.002z"></path>';
    html += "</svg>";
    html += "</div>";

    html += '<div class="pxl-comments__reply-img">';
    if (pxl_ajax_object.is_logged_in === "1") {
      html += '<img src="' + pxl_ajax_object.user_avatar + '" alt="User Avatar">';
    } else {
      html +=
        '<img src="' +
        pxl_ajax_object.template_directory +
        '/assets/img/df-avt.jpg" alt="Default Avatar">';
    }
    html += "</div>";

    html += '<form action="javascript:void(0);" method="post" class="pxl-comments__reply-form">';
    html += '<input type="hidden" name="action" value="post_comment_reply">';
    html += '<input type="hidden" name="comment_parent_id" class="comment-parent-id" value="">';
    html += '<input type="hidden" name="post_id" value="' + data.post_id + '">';
    html += '<input type="hidden" name="nonce" value="' + pxl_ajax_object.nonce + '">';

    if (pxl_ajax_object.is_logged_in === "0") {
      html += '<div class="pxl-comments__reply-fields">';
      html += '<input type="text" name="comment_author" placeholder="Your name" required>';
      html += '<input type="email" name="comment_author_email" placeholder="Your email" required>';
      html += "</div>";
    }

    html += '<textarea name="comment_content" placeholder="Message" required></textarea>';
    html += '<button type="submit">';
    html +=
      '<svg enable-background="new 0 0 512.005 512.005" height="512" viewBox="0 0 512.005 512.005" width="512" xmlns="http://www.w3.org/2000/svg">';
    html +=
      '<path d="m511.658 51.675c2.496-11.619-8.895-21.416-20.007-17.176l-482 184c-5.801 2.215-9.638 7.775-9.65 13.984-.012 6.21 3.803 11.785 9.596 14.022l135.403 52.295v164.713c0 6.948 4.771 12.986 11.531 14.593 6.715 1.597 13.717-1.598 16.865-7.843l56.001-111.128 136.664 101.423c8.313 6.17 20.262 2.246 23.287-7.669 127.599-418.357 122.083-400.163 122.31-401.214zm-118.981 52.718-234.803 167.219-101.028-39.018zm-217.677 191.852 204.668-145.757c-176.114 185.79-166.916 176.011-167.684 177.045-1.141 1.535 1.985-4.448-36.984 72.882zm191.858 127.546-120.296-89.276 217.511-229.462z"></path>';
    html += "</svg>";
    html += "</button>";
    html += "</form>";
    html += "</div>";

    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</li>";

    return html;
  }

  function handleCommentFormSubmit() {
    $("#commentform").on("submit", function (e) {
      e.preventDefault();

      var form = $(this);
      var submitBtn = form.find("#submit");
      var originalText = submitBtn.text();

      submitBtn.prop(
        "disabled",
        true
      ).html(`Sending <svg width="25" height="8" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg" fill="white" style="margin: 0 0 -3px -5px;">
                  <circle cx="10" cy="10" r="4">
                      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
                  <circle cx="30" cy="10" r="4">
                      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.2;0.4;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="10" r="4">
                      <animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
              </svg>`);

      var formData = {
        action: "post_new_comment",
        post_id: $('input[name="comment_post_ID"]').val(),
        comment_content: $("#comment").val(),
        rating: $("#rating").val(),
        nonce: pxl_ajax_object.nonce
      };

      if (pxl_ajax_object.is_logged_in === "0") {
        formData.comment_author = $("#author").val();
        formData.comment_author_email = $("#email").val();
      }

      $.ajax({
        url: pxl_ajax_object.ajax_url,
        type: "POST",
        data: formData,
        success: function (response) {
          if (response.success) {
            form[0].reset();
            var newCommentHTML = createNewCommentHTML(response.data);

            if ($(".pxl-comments__list").length === 0) {
              var commentsSection = '<div class="pxl-comments__wrap">';
              commentsSection += '<h3 class="pxl-comments__title">';
              commentsSection += "1 Comment</h3>";
              commentsSection += '<ul class="pxl-comments__list"></ul>';
              commentsSection += "</div>";
              $(".pxl-comments").prepend(commentsSection);
            }

            $(".pxl-comments__list").append(newCommentHTML);

            var currentTitle = $(".pxl-comments__title").html();
            var newCount = $(".pxl-comments__list .comment").length;
            var newTitle = currentTitle.replace(
              /\d+\s+(Comment|Comments)/,
              newCount + (newCount === 1 ? " Comment" : " Comments")
            );
            $(".pxl-comments__title").html(newTitle);

            initEvents();
            showNotification("Comment submitted successfully.", "success");
          } else {
            showNotification("Error: " + response.data, "error");
          }
        },
        error: function () {
          showNotification("An error occurred. Please try again.", "error");
        },
        complete: function () {
          submitBtn.prop("disabled", false).text(originalText);
        }
      });
    });
  }

  $(document).ready(function () {
    $(".pxl-comments__reply-form").attr("action", "javascript:void(0);");

    if ($(".pxl-comments__reply-form").find('input[name="nonce"]').length === 0) {
      $(".pxl-comments__reply-form").append(
        '<input type="hidden" name="nonce" value="' + pxl_ajax_object.nonce + '">'
      );
    }

    initEvents();
    handleFormSubmit();
    $(document).on("click", ".pxl-comment__action-hide", function () {
      $(this).toggleClass("active");
    });
    $(document).on("click", ".pxl-comment__opt li:first-child", function () {
      $(this).closest(".pxl-comments__item").remove();
    });
    $(document).on("click", ".pxl-comments__reply-cancel", function () {
      $(this).parent().hide();
    });

    if (pxl_ajax_object.is_logged_in === "0") {
      $(".pxl-comments__reply-form").each(function () {
        var form = $(this);
    
        if (form.find('input[name="comment_author"]').length === 0) {
          var contentInput = form.find('textarea[name="comment_content"]');
    
          var fieldsContainer = $('<div class="pxl-comments__reply-fields"></div>');
          fieldsContainer.append('<input type="text" name="comment_author" placeholder="Your name" required>');
          fieldsContainer.append('<input type="email" name="comment_author_email" placeholder="Your email" required>');
    
          contentInput.before(fieldsContainer);
        }
      });
    
      $(".pxl-comments__reply-img img").attr(
        "src",
        pxl_ajax_object.template_directory + "/assets/img/df-avt.jpg"
      );
    }
    
  });
})(jQuery);
