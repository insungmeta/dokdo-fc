package io.github.insungmeta.dokdofc;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.KeyEvent;
import android.window.OnBackInvokedDispatcher;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Independent DOKDO FC club reader.
 *
 * Security boundaries:
 *  - HTTPS only, navigation restricted to the club's GitHub Pages path
 *  - External https links open the system browser, never inside the app
 *  - No JavaScript bridge, no private file access or third-party cookies
 *  - No location / camera / microphone / storage / contacts / notifications permissions
 *  - SSL failures are cancelled, never bypassed
 *
 * This app does not establish rights to EA's independently operated API.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://insungmeta.github.io/dokdo-fc/";
    private static final String HOST = "insungmeta.github.io";
    private static final String SITE_PREFIX = "/dokdo-fc/";

    private WebView webView;
    private LinearLayout offlinePanel;
    private boolean mainDocumentFailed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 23, 35));
        getWindow().setNavigationBarColor(Color.rgb(11, 23, 35));
        WebView.setWebContentsDebuggingEnabled(false);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(11, 23, 35));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 23, 35));
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        configureWebView();
        root.addView(webView);

        offlinePanel = makeOfflinePanel();
        root.addView(offlinePanel);
        setContentView(root);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    () -> {
                        if (webView != null && webView.getVisibility() == View.VISIBLE
                                && webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            finish();
                        }
                    });
        }
        webView.loadUrl(HOME);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // needed for our club dashboard
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return handleExternalNavigation(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainDocumentFailed = false;
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!mainDocumentFailed) showOffline(false);
                super.onPageFinished(view, url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainDocumentFailed = true;
                    showOffline(true);
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                    WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 400) {
                    mainDocumentFailed = true;
                    showOffline(true);
                }
                super.onReceivedHttpError(view, request, errorResponse);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // never proceed through invalid TLS certificates
                mainDocumentFailed = true;
                showOffline(true);
            }
        });

        // User-initiated target="_blank" links open outside the app.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                    boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                final WebView popup = new WebView(MainActivity.this);
                popup.getSettings().setJavaScriptEnabled(false);
                popup.getSettings().setAllowFileAccess(false);
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView ignored, WebResourceRequest request) {
                        launchBrowserIfHttps(request.getUrl());
                        popup.destroy();
                        return true;
                    }
                    @Override
                    public void onPageStarted(WebView ignored, String url, android.graphics.Bitmap favicon) {
                        if (url.startsWith("https://")) launchBrowserIfHttps(Uri.parse(url));
                        popup.destroy();
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null) launchBrowserIfHttps(Uri.parse(url));
        });
    }

    private boolean handleExternalNavigation(Uri uri) {
        if (uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && HOST.equalsIgnoreCase(uri.getHost())
                && uri.getPath() != null && uri.getPath().startsWith(SITE_PREFIX)) {
            return false; // club page, privacy notice or language switch
        }
        launchBrowserIfHttps(uri);
        return true; // block foreign hosts and unsafe schemes in the embedded browser
    }

    private void launchBrowserIfHttps(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri)
                    .addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {
            // A browser is not installed. Never fall back to an unsafe WebView origin.
        }
    }

    private LinearLayout makeOfflinePanel() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(24), dp(32), dp(24), dp(32));
        box.setBackgroundColor(Color.rgb(11, 23, 35));

        TextView message = new TextView(this);
        message.setText(R.string.network_problem);
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        box.addView(message);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(view -> {
            showOffline(false);
            webView.loadUrl(HOME);
        });
        box.addView(retry);

        Button browser = new Button(this);
        browser.setText(R.string.open_browser);
        browser.setOnClickListener(view -> launchBrowserIfHttps(Uri.parse(HOME)));
        box.addView(browser);

        box.setVisibility(View.GONE);
        return box;
    }

    private void showOffline(boolean offline) {
        if (offlinePanel == null || webView == null) return;
        offlinePanel.setVisibility(offline ? View.VISIBLE : View.GONE);
        webView.setVisibility(offline ? View.GONE : View.VISIBLE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    // Handle hardware Back on older Android; API 33+ gesture Back is registered above.
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null
                && webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            if (webView.getParent() instanceof ViewGroup) {
                ((ViewGroup) webView.getParent()).removeView(webView);
            }
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
