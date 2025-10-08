import React from 'react';
import { Alert, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import Signature from 'react-native-signature-canvas';
import * as Print from 'expo-print';
import { useNavigation, useRoute } from '@react-navigation/native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type EditorParams = {
  productId: string;
  productTitle?: string;
};

export default function ProductContractEditor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken } = useAuth();
  const { productId, productTitle } = (route.params as any) as EditorParams;
  const isPreview = productId === 'preview';

  const [htmlContent, setHtmlContent] = React.useState('');
  const [sellerSignature, setSellerSignature] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [previewHtml, setPreviewHtml] = React.useState('');
  const signatureRef = React.useRef<any>(null);
  const pendingSigResolve = React.useRef<((s: string) => void) | null>(null);
  const [docHeight, setDocHeight] = React.useState<number>(400);

  const [customTermsText, setCustomTermsText] = React.useState('');
  const [isSigning, setIsSigning] = React.useState(false);

  // Convert plain text to HTML (each line becomes a list item)
  const textToHtml = (text: string): string => {
    if (!text || !text.trim()) return '';
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    
    const listItems = lines.map(line => `    <li>${line.trim()}</li>`).join('\n');
    return `
<div class="section">
  <div class="title">ĐIỀU KHOẢN BỔ SUNG CỦA NGƯỜI BÁN</div>
  <ul>
${listItems}
  </ul>
</div>
`;
  };

  // Convert HTML back to plain text for editing
  const htmlToText = (html: string): string => {
    if (!html) return '';
    // Extract text from <li> tags
    const matches = html.match(/<li>(.*?)<\/li>/g);
    if (!matches) return '';
    return matches.map(m => m.replace(/<\/?li>/g, '').trim()).join('\n');
  };

  React.useEffect(() => {
    (async () => {
      try {
        if (isPreview) return; // Skip fetching from backend in preview mode
        // Fetch existing template if any
        const res = await fetch(`${API_URL}/api/products/${productId}/contract-template`);
        const data = await res.json();
        if (res.ok && data?.data?.contractTemplate?.htmlContent) {
          const html = data.data.contractTemplate.htmlContent;
          setHtmlContent(html);
          setCustomTermsText(htmlToText(html)); // Convert to text for editing
          setSellerSignature(data.data.contractTemplate.sellerSignature || null);
        }
      } catch {
        // Start with empty
      } finally {
        setIsLoading(false);
      }
    })();
  }, [productId, isPreview]);

  // Rebuild preview and HTML when text or signature changes
  React.useEffect(() => {
    const generatedHtml = textToHtml(customTermsText);
    setHtmlContent(generatedHtml);
  }, [customTermsText]);

  React.useEffect(() => {
    const sig = sellerSignature ? `<img src="${sellerSignature}" style="height:60px;" />` : '<div style="height:60px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">Chưa ký</div>';
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview Hợp Đồng</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 16px; color: #111827; line-height: 1.6; }
    .title { font-weight: 700; font-size: 15px; margin-bottom: 6px; margin-top: 12px; }
    .section { margin-top: 12px; }
    ul { margin: 0; padding-left: 18px; }
    .signBox { margin-top: 20px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
  </style>
</head>
<body>
  <h3>Sản phẩm: ${productTitle || 'N/A'}</h3>
  ${htmlContent}
  <div class="signBox">
    <div><strong>Chữ ký người bán:</strong></div>
    ${sig}
  </div>
</body>
</html>`;
    setPreviewHtml(html);
  }, [htmlContent, sellerSignature, productTitle]);

  const handleSave = async () => {
    try {
      if (isPreview) {
        Alert.alert('Chưa thể lưu', 'Vui lòng tạo sản phẩm trước, rồi vào màn hình chỉnh hợp đồng để lưu.');
        return;
      }
      if (!customTermsText.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một điều khoản');
        return;
      }
      // Ensure we have the freshest signature: if missing, try to read from pad
      let sigForSave: string | null = sellerSignature;
      if (!sigForSave && signatureRef?.current?.readSignature) {
        sigForSave = await new Promise<string | null>((resolve) => {
          let settled = false;
          const to = setTimeout(() => { if (!settled) resolve(null); }, 1500);
          pendingSigResolve.current = (s: string) => { try { clearTimeout(to); } catch {}; settled = true; resolve(s); };
          try { signatureRef.current.readSignature(); } catch { resolve(null); }
        });
      }
      if (!sigForSave) {
        Alert.alert('Lỗi', 'Vui lòng ký tên trước khi lưu');
        return;
      }
      // Sync state for consistency
      try { setSellerSignature(sigForSave); } catch {}
      setIsUploading(true);

      // Generate PDF from preview
      const { uri } = await Print.printToFileAsync({ html: previewHtml });

      // Upload to Cloudinary
      const formCloud = new FormData();
      formCloud.append('file', { uri, name: 'seller-contract-template.pdf', type: 'application/pdf' } as any);
      formCloud.append('upload_preset', 'unsigned_contracts');
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || ''}/image/upload`, {
        method: 'POST',
        body: formCloud as any,
      });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData?.error?.message || 'Upload thất bại');
      const pdfUrl = cloudData.secure_url;

      // Save to backend
      const res = await fetch(`${API_URL}/api/products/${productId}/contract-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          htmlContent,
          sellerSignature: sigForSave,
          pdfUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Lưu thất bại');

      Alert.alert('Thành công', 'Đã lưu hợp đồng tùy chỉnh', [
        { text: 'OK', onPress: () => (navigation as any).goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể lưu hợp đồng');
    } finally {
      setIsUploading(false);
    }
  };

  const injected = `
    (function(){
      function sendHeight(){
        var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 400);
        if (window.ReactNativeWebView && h) window.ReactNativeWebView.postMessage(String(h));
      }
      var obs = new MutationObserver(sendHeight);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('load', sendHeight);
      setTimeout(sendHeight, 0);
      setTimeout(sendHeight, 200);
    })();
    true;
  `;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView style={{ backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()} style={{ padding: 6 }}>
            <Text>Hủy</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000', paddingRight: 48 }}>Tùy chỉnh hợp đồng</Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Đang tải...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} scrollEnabled={!isSigning}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Điều khoản bổ sung:</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Nhập mỗi điều khoản một dòng. Ví dụ:{'\n'}
              • Bảo hành pin 24 tháng{'\n'}
              • Miễn phí vận chuyển trong bán kính 20km{'\n'}
              • Tặng kèm bộ phụ kiện
            </Text>
            <TextInput
              value={customTermsText}
              onChangeText={setCustomTermsText}
              multiline
              numberOfLines={8}
              placeholder="Nhập mỗi điều khoản một dòng...&#10;Bảo hành động cơ 12 tháng&#10;Bảo hành pin 24 tháng&#10;Miễn phí bảo dưỡng 3 lần đầu"
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: '#000',
                minHeight: 160,
                textAlignVertical: 'top',
              }}
            />
          </View>

          

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Chữ ký của bạn (người bán):</Text>
            <View style={{ height: 200, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <Signature
                ref={signatureRef}
                onOK={(sig: string) => { setSellerSignature(sig); try { pendingSigResolve.current?.(sig); pendingSigResolve.current = null; } catch {} }}
                onClear={() => setSellerSignature(null)}
                onBegin={() => setIsSigning(true)}
                onEnd={() => setIsSigning(false)}
                descriptionText="Ký vào đây"
                webStyle={`
                  .m-signature-pad--footer { display: flex; justify-content: space-between; }
                  .m-signature-pad--footer .button { background: #FFD700; color: #000; }
                `}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => { try { signatureRef.current?.clearSignature?.(); } catch {} setSellerSignature(null); }}
                style={{ flex: 1, backgroundColor: '#eee', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 }}
              >
                <Text style={{ color: '#000', fontWeight: '700' }}>Xóa chữ ký</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  (navigation as any).navigate('ContractPreview', {
                    previewOnly: true,
                    sellerContractHtmlOverride: htmlContent,
                    sellerSignatureOverride: sellerSignature,
                  });
                }}
                style={{ flex: 1, backgroundColor: '#eee', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '700' }}>Xem hợp đồng</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={isUploading} style={{ flex: 1, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 8 }}>
                {isUploading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Lưu hợp đồng</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

