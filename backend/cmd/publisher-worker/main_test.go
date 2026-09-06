package main

import (
	"testing"

	"github.com/postilka/postilka/internal/service"
)

func TestAttachPublicationNotifier(t *testing.T) {
	publicationSvc := service.NewPublicationService(nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)
	notificationSvc := service.NewNotificationService(nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	if !attachPublicationNotifier(publicationSvc, notificationSvc) {
		t.Fatal("attachPublicationNotifier must return true for valid services")
	}
}
