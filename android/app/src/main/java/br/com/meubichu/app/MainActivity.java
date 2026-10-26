package br.com.meubichu.app;

import android.Manifest;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.*;

/** HTTPS-only app shell. The same API enforces all authorization. No native JS bridge. */
public class MainActivity extends ComponentActivity {
 private static final String ORIGIN="https://meu-bichu-app-production.up.railway.app";
 private WebView web;
 private LinearLayout root;
 private ValueCallback<Uri[]> upload;
 private GeolocationPermissions.Callback geo;
 private String geoOrigin;
 private boolean trusted(Uri uri){return "https".equals(uri.getScheme())&&"meu-bichu-app-production.up.railway.app".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
 private void external(Uri uri){String s=uri.getScheme();if(!"https".equals(s)&&!"mailto".equals(s)&&!"tel".equals(s))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(this,"Não foi possível abrir este link.",Toast.LENGTH_SHORT).show();}}
 @Override public void onCreate(Bundle state){super.onCreate(state);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});root.requestApplyInsets();
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,-1));web.setBackgroundColor(0xfff4f7f1);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setGeolocationEnabled(true);CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  WebView.setWebContentsDebuggingEnabled(false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){if(trusted(r.getUrl()))return false;external(r.getUrl());return true;}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())showRetry();}
   @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse response){if(r.isForMainFrame()&&response.getStatusCode()>=500)showRetry();}
   @Override public void onPageFinished(WebView v,String url){CookieManager.getInstance().flush();}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(!trusted(Uri.parse(v.getUrl()==null?"":v.getUrl())))return false;if(upload!=null)upload.onReceiveValue(null);upload=callback;Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("image/*");pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);try{startActivityForResult(pick,1);}catch(Exception e){upload.onReceiveValue(null);upload=null;}return true;}
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){if(!trusted(Uri.parse(origin))){callback.invoke(origin,false,false);return;}new AlertDialog.Builder(MainActivity.this).setTitle("Localização opcional").setMessage("Permitir que o Meu Bichu receba sua localização aproximada? Você pode continuar usando os cuidados do pet sem ela.").setNegativeButton("Agora não",(d,w)->callback.invoke(origin,false,false)).setPositiveButton("Permitir",(d,w)->{if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)callback.invoke(origin,true,false);else{if(geo!=null)geo.invoke(geoOrigin,false,false);geo=callback;geoOrigin=origin;requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION},2);}}).setOnCancelListener(d->callback.invoke(origin,false,false)).show();}
  });
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){if(web.canGoBack())web.goBack();else finish();}});
  if(state==null||web.restoreState(state)==null)web.loadUrl(ORIGIN+"/");
 }
 private void showRetry(){runOnUiThread(()->{if(isFinishing())return;new AlertDialog.Builder(this).setTitle("Sem conexão com o Meu Bichu").setMessage("Confira sua conexão e tente novamente. Não feche uma sessão com alterações pendentes.").setPositiveButton("Tentar novamente",(d,w)->web.reload()).setNegativeButton("Fechar",null).show();});}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==1&&upload!=null){Uri[] uris=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){int n=data.getClipData().getItemCount();uris=new Uri[n];for(int i=0;i<n;i++)uris[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null)uris=new Uri[]{data.getData()};}upload.onReceiveValue(uris);upload=null;}}
 @Override public void onRequestPermissionsResult(int req,String[] permissions,int[] results){super.onRequestPermissionsResult(req,permissions,results);if(req==2&&geo!=null){geo.invoke(geoOrigin,results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED,false);geo=null;}}
 @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
 @Override protected void onDestroy(){if(upload!=null)upload.onReceiveValue(null);if(geo!=null)geo.invoke(geoOrigin,false,false);web.destroy();super.onDestroy();}
}
