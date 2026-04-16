from django.urls import path

from . import oauth_views, views

urlpatterns = [
    path(
        "oauth/start/",
        oauth_views.PinterestOAuthStartView.as_view(),
        name="marketing-oauth-start",
    ),
    path(
        "oauth/callback/",
        oauth_views.PinterestOAuthCallbackView.as_view(),
        name="marketing-oauth-callback",
    ),
    path(
        "oauth/disconnect/",
        oauth_views.PinterestOAuthDisconnectView.as_view(),
        name="marketing-oauth-disconnect",
    ),
    path(
        "status/",
        oauth_views.PinterestConnectionStatusView.as_view(),
        name="marketing-status",
    ),
    path("boards/", views.GetPinterestBoardsView.as_view(), name="marketing-boards"),
    path(
        "publish-single/",
        views.PublishSingleSocialPostView.as_view(),
        name="marketing-publish-single",
    ),
]
