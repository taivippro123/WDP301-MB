import React from 'react';
import { Alert, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import Signature from 'react-native-signature-canvas';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type ContractParams = {
  productId: string;
  sellerId?: string;
  product?: any;
  receiver?: { name: string; phone: string; addressLine: string; ward: string; district: string; province: string };
  unitPrice?: number;
  shippingFee?: number;
};

export default function ContractScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken } = useAuth();
  const { productId, sellerId, product, receiver, unitPrice, shippingFee } = (route.params as any) as ContractParams;

  const [isLoading, setIsLoading] = React.useState(true);
  const [html, setHtml] = React.useState('');
  const [contractId, setContractId] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showPdfModal, setShowPdfModal] = React.useState(false);
  const [pdfLoading, setPdfLoading] = React.useState<boolean>(false);
  const placeholdersRef = React.useRef<{ sellerName?: string; buyerName?: string; productTitle?: string; unitPrice?: number } | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null);
  const [isSigning, setIsSigning] = React.useState<boolean>(false);
  const signatureRef = React.useRef<any>(null);
  const pendingSigResolve = React.useRef<((s: string) => void) | null>(null);
  const [productDetail, setProductDetail] = React.useState<any>(null);

  function numberToVietnameseWords(n: number): string {
    const dv = ['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
    const chu = ['',' nghìn',' triệu',' tỷ',' nghìn tỷ'];
    function read3(num: number, full: boolean): string {
      const tr = Math.floor(num/100), ch = Math.floor((num%100)/10), dvn = num%10;
      let s = '';
      if (full || tr > 0) { s += dv[tr] + ' trăm'; }
      if (ch > 1) { s += (s?' ':'') + dv[ch] + ' mươi'; if (dvn === 1) s += ' mốt'; else if (dvn === 5) s += ' lăm'; else if (dvn>0) s += ' ' + dv[dvn]; }
      else if (ch === 1) { s += (s?' ':'') + 'mười'; if (dvn === 5) s += ' lăm'; else if (dvn>0) s += ' ' + dv[dvn]; }
      else if (dvn>0) { if (s) s += ' lẻ'; s += ' ' + dv[dvn]; }
      return s.trim();
    }
    if (!n || n <= 0) return 'không đồng';
    let i = 0; let str = '';
    while (n > 0 && i < chu.length) {
      const block = n % 1000;
      if (block > 0) {
        const prefix = read3(block, str.length>0);
        str = prefix + chu[i] + (str ? ' ' + str : '');
      }
      n = Math.floor(n/1000); i++;
    }
    return (str + ' đồng').replace(/\s+/g,' ').trim();
  }

  function fullReceiverAddress(): string {
    const r = receiver || ({} as any);
    return [r.addressLine, r.ward, r.district, r.province].filter(Boolean).join(', ');
  }

  function formatSellerAddress(p: any): string {
    const a = p?.seller?.address || {};
    return [a.houseNumber, a.ward, a.district, a.province].filter(Boolean).join(', ');
  }

  function buildPrettyHtml(overrideSig?: string | null) {
    const p = placeholdersRef.current || {} as any;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const unit = typeof unitPrice === 'number' ? unitPrice : (p.unitPrice || 0);
    const currency = new Intl.NumberFormat('vi-VN').format(Number(unit || 0));
    const currencyText = numberToVietnameseWords(Number(unit || 0));
    const productTitle = p.productTitle || (productDetail?.title || product?.title || '');
    const sellerName = p.sellerName || productDetail?.seller?.name || (product as any)?.seller?.name || 'Bên bán';
    const sellerPhone = productDetail?.seller?.phone || (product as any)?.seller?.phone || '';
    const sellerAddress = formatSellerAddress(productDetail || (product as any)) || '';
    const brand = productDetail?.brand || (product as any)?.brand || '';
    const model = productDetail?.model || (product as any)?.model || '';
    const year = productDetail?.year || (product as any)?.year || '';
    const conditionRaw = (productDetail?.condition || (product as any)?.condition || '').toString().toLowerCase();
    const condition = (() => {
      if (conditionRaw === 'used') return 'cũ';
      if (conditionRaw === 'refurbished') return 'tân trang';
      return productDetail?.condition || (product as any)?.condition || '';
    })();
    const buyerName = p.buyerName || (receiver?.name || 'Bên mua');
    const receiverPhone = receiver?.phone || '';
    const deliveryPlace = fullReceiverAddress();
    const deliveryDate = (() => { const d = new Date(); d.setDate(d.getDate()+3); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })();
    const sig = (overrideSig !== undefined ? overrideSig : signatureDataUrl) || null;
    const signImg = sig ? `<img src="${sig}" style="height:80px;" />` : '<div style="height:80px"></div>';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hợp đồng mua bán</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 28px; color: #111827; line-height: 1.65; }
    h1, h2, h3 { margin: 0 0 8px; }
    h1 { text-align: center; font-size: 18px; }
    .center { text-align: center; }
    .subtitle { text-align: center; margin-top: 4px; font-weight: 600; }
    .divider { border-top: 1px solid #e5e7eb; margin: 10px 0 16px; }
    .row { margin: 6px 0; }
    .section { margin-top: 14px; }
    .title { font-weight: 700; font-size: 15px; margin-bottom: 6px; }
    ul { margin: 0; padding-left: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
    .signBox { text-align: center; padding-top: 24px; }
    .muted { }
    .signed { font-weight: 700; }
    .unsigned { font-weight: 700; }
    .small { font-size: 12px; }
  </style>
</head>
<body>
  <div class="center" style="margin-bottom: 12px;">
    <div style="font-weight:700">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div>Độc lập – Tự do – Hạnh phúc</div>
  </div>
  <div class="divider"></div>
  <div class="center" style="margin: 10px 0 18px;">
    <div style="font-weight:700; font-size: 18px;">HỢP ĐỒNG MUA BÁN XE ĐIỆN / PIN XE ĐIỆN</div>
  </div>

  <div class="row small muted">Hôm nay, ngày ${dd} tháng ${mm} năm ${yyyy}, chúng tôi gồm:</div>

  <div class="section">
    <div class="title">BÊN BÁN (Bên A):</div>
    <ul>
      <li>Họ và tên/Tên doanh nghiệp: ${sellerName} <span class="signed">(đã ký)</span></li>
      <li>CMND/CCCD/MST: …………………………………</li>
      <li>Địa chỉ: ${sellerAddress || '…'}</li>
      <li>Điện thoại: ${sellerPhone || '…'}</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">BÊN MUA (Bên B):</div>
    <ul>
      <li>Họ và tên/Tên doanh nghiệp: ${buyerName} <span class="unsigned"></span></li>
      <li>CMND/CCCD/MST: …………………………………</li>
      <li>Địa chỉ: ${deliveryPlace || '…'}</li>
      <li>Điện thoại: ${receiverPhone || '…'}</li>
    </ul>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="title">ĐIỀU 1. ĐỐI TƯỢNG HỢP ĐỒNG</div>
    <ul>
      <li>Loại: Xe điện</li>
      <li>Nhãn hiệu: ${brand || '…'}</li>
      <li>Model/Đời: ${model || '…'}</li>
      <li>Năm sản xuất: ${year || '…'}</li>
      <li>Tình trạng: ${condition || '…'}</li>
      <li>Sản phẩm: ${productTitle}</li>
      <li>Giá trị còn lại của pin (nếu có): …………………………………</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 2. GIÁ BÁN VÀ PHƯƠNG THỨC THANH TOÁN</div>
    <ul>
      <li>Giá bán: ${currency} VNĐ (Bằng chữ: <strong>${currencyText}</strong>)</li>
      <li>Giá trên không bao gồm chi phí vận chuyển, thuế, phí khác.</li>
      <li>Phương thức thanh toán: Ví điện tử Ecoin</li>
      <li>Thời hạn thanh toán: Ngay khi ký hợp đồng</àli>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 3. GIAO NHẬN</div>
    <ul>
      <li>Địa điểm giao hàng: ${deliveryPlace || '…'}</li>
      <li>Thời gian giao hàng: khoảng ${deliveryDate}</li>
      <li>Bên A cam kết bàn giao đầy đủ giấy tờ liên quan.</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 4. QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
    <ul>
      <li>Cung cấp sản phẩm đúng thông tin đã cam kết.</li>
      <li>Chịu trách nhiệm về nguồn gốc hợp pháp của sản phẩm.</li>
      <li>Bảo hành (nếu có): …………………………………</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
    <ul>
      <li>Thanh toán đúng thời hạn, đúng số tiền đã thỏa thuận.</li>
      <li>Nhận sản phẩm theo đúng thời gian, địa điểm.</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 6. GIẢI QUYẾT TRANH CHẤP</div>
    <ul>
      <li>Hai bên ưu tiên giải quyết bằng thương lượng, hòa giải.</li>
      <li>Nếu không đạt thỏa thuận, đưa ra Tòa án có thẩm quyền.</li>
    </ul>
  </div>

  <div class="section">
    <div class="title">ĐIỀU 7. ĐIỀU KHOẢN CHUNG</div>
    <ul>
      <li>Hợp đồng này có hiệu lực kể từ ngày ký.</li>
      <li>Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản.</li>
    </ul>
  </div>

  <div class="grid">
    <div class="signBox">
      <div><strong>ĐẠI DIỆN BÊN A (Bán)</strong></div>
      <div class="small muted">Ký, ghi rõ họ tên</div>
      <div style="margin-top: 33px; font-weight: 800;">Đã ký</div>
      <div style="margin-top: 24px;"></div>
      <div>${sellerName}</div>
      <div class="signed"></div>
    </div>
    <div class="signBox">
      <div><strong>ĐẠI DIỆN BÊN B (Mua)</strong></div>
      <div class="small muted">Ký, ghi rõ họ tên</div>
      ${signImg}
      <div>${buyerName}</div>
      <div class="unsigned"></div>
    </div>
  </div>
</body>
</html>`;
  }

  React.useEffect(() => {
    (async () => {
      try {
        // Prefer product from params immediately for rendering
        try { if (product && (product as any)._id) setProductDetail(product as any); } catch {}
        const res1 = await fetch(`${API_URL}/api/contracts/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ product_id: productId, seller_id: sellerId })
        });
        const d1 = await res1.json();
        if (!res1.ok) throw new Error(d1?.error || 'Không khởi tạo hợp đồng được');
        setContractId(d1?.data?.contractId);
        try { placeholdersRef.current = d1?.data?.template?.placeholders || null; } catch {}

        // Fetch product detail to enrich contract content (brand/model/year/condition and seller contact)
        try {
          const rp = await fetch(`${API_URL}/api/products/${productId}`);
          const pd = await rp.json();
          const prod = pd?.data || pd?.product || (Array.isArray(pd?.products) ? pd.products[0] : null) || pd || null;
          if (prod && prod._id) setProductDetail(prod);
        } catch {}

        // First render
        setHtml(buildPrettyHtml());
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được hợp đồng');
        (navigation as any).goBack();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [productId, sellerId, accessToken, navigation]);

  // Rebuild HTML when dependent data changes (product detail, signature)
  React.useEffect(() => {
    setHtml(buildPrettyHtml());
  }, [productDetail, signatureDataUrl]);

  const signAndUpload = React.useCallback(async () => {
    try {
      if (!contractId) {
        Alert.alert('Lỗi', 'Thiếu contractId');
        return;
      }
      setIsUploading(true);
      let sigForPrint: string | null = signatureDataUrl;
      if (!sigForPrint && signatureRef?.current?.readSignature) {
        sigForPrint = await new Promise<string | null>((resolve) => {
          let settled = false;
          const to = setTimeout(() => { if (!settled) resolve(null); }, 1500);
          pendingSigResolve.current = (s: string) => { try { clearTimeout(to); } catch {}; settled = true; resolve(s); };
          try { signatureRef.current.readSignature(); } catch { resolve(null); }
        });
      }
      // Generate PDF from HTML using the freshest signature (override)
      const htmlToPrint = buildPrettyHtml(sigForPrint);
      const { uri } = await Print.printToFileAsync({ html: htmlToPrint });

      // Upload to Cloudinary unsigned preset (public, previewable)
      const formCloud = new FormData();
      formCloud.append('file', { uri, name: 'contract.pdf', type: 'application/pdf' } as any);
      formCloud.append('upload_preset', 'unsigned_contracts');
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/'+(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME||'')+'/image/upload', {
        method: 'POST',
        body: formCloud as any,
      });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData?.error?.message || 'Upload Cloudinary thất bại');
      const finalUrl: string = cloudData.secure_url;

      // Notify backend to finalize contract (store URL and mark signed)
      const form = new FormData();
      form.append('contractId', contractId);
      form.append('finalUrl', finalUrl);
      const res = await fetch(`${API_URL}/api/contracts/sign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form as any,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Finalize thất bại');
      return true;
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể ký hợp đồng');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [signatureDataUrl, contractId, accessToken, navigation]);

  const placeOrderAfterSigned = React.useCallback(async () => {
    const body: any = {
      to_name: receiver?.name?.trim() || '',
      to_phone: receiver?.phone?.trim() || '',
      to_address: receiver?.addressLine?.trim() || '',
      to_ward_name: receiver?.ward?.trim() || '',
      to_district_name: receiver?.district?.trim() || '',
      to_province_name: receiver?.province?.trim() || '',
      length: (product as any)?.length || 30,
      width: (product as any)?.width || 40,
      height: (product as any)?.height || 20,
      weight: (product as any)?.weight || 3000,
      service_type_id: 2,
      payment_type_id: 2,
      insurance_value: 0,
      cod_amount: 0,
      required_note: 'KHONGCHOXEMHANG',
      content: (product as any)?.title || 'Hàng hóa',
      product_id: (product as any)?._id || productId,
      seller_id: sellerId,
      unit_price: Number(unitPrice || (product as any)?.price || 0),
      shipping_fee: Number(shippingFee || 0),
      items: [
        {
          name: (product as any)?.title || 'Hàng hóa',
          code: (product as any)?._id || undefined,
          quantity: 1,
          price: Number(unitPrice || (product as any)?.price || 0),
          length: (product as any)?.length || undefined,
          width: (product as any)?.width || undefined,
          height: (product as any)?.height || undefined,
          weight: (product as any)?.weight || undefined,
          category: { level1: (product as any)?.category || undefined },
        },
      ],
    };
    const res = await fetch(`${API_URL}/api/shipping/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
    if (!res.ok) {
      const msg = data?.error || data?.message || (typeof data === 'string' ? data : 'Không thể tạo đơn hàng');
      throw new Error(msg);
    }
    return data;
  }, [receiver, product, productId, sellerId, unitPrice, shippingFee, accessToken]);

  const handleConfirm = React.useCallback(async () => {
    const ok = await signAndUpload();
    if (!ok) return;
    try {
      const order = await placeOrderAfterSigned();
      Alert.alert('Thành công', `Đã tạo đơn hàng. Mã: ${order?.data?.order_code || order?.order_code || 'N/A'}`);
      const root = (navigation as any).getParent?.() || navigation;
      // Reset to Home tab root after success to avoid going back to contract
      try { (root as any).navigate('Trang chủ', { screen: 'HomeList' }); } catch {}
      // Then open OrderHistory for confirmation
      setTimeout(() => {
        try { (root as any).navigate('Tài khoản', { screen: 'OrderHistory', params: { fromOrderSuccess: true } }); } catch {}
      }, 0);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo đơn hàng');
    }
  }, [signAndUpload, placeOrderAfterSigned, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      const tabNav: any = (navigation as any).getParent?.()?.getParent?.() || (navigation as any).getParent?.();
      // Hide bottom tab when this screen is focused
      tabNav?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        // Restore default bottom tab style when leaving
        tabNav?.setOptions({
          tabBarStyle: {
            backgroundColor: 'white',
            height: 90,
            paddingBottom: 2,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: '#E5E5E7',
          }
        });
      };
    }, [navigation])
  );

  const [docHeight, setDocHeight] = React.useState<number>(200);
  const injected = `
    (function(){
      function sendHeight(){
        var body = document.body;
        var html = document.documentElement;
        var rectH = Math.ceil(body.getBoundingClientRect().height);
        var scrollH = Math.max(body.scrollHeight, html.scrollHeight);
        var clientH = Math.max(html.clientHeight, body.clientHeight || 0);
        var h = Math.max(rectH, scrollH, clientH);
        if (window.ReactNativeWebView && h) {
          window.ReactNativeWebView.postMessage(String(h));
        }
      }
      var obs = new MutationObserver(sendHeight);
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      window.addEventListener('load', sendHeight);
      window.addEventListener('resize', sendHeight);
      setTimeout(sendHeight, 0);
      setTimeout(sendHeight, 200);
      setTimeout(sendHeight, 600);
    })();
    true;
  `;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView style={{ backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={{ padding: 6 }}>
          <Text>Đóng</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000', paddingRight: 48 }}>Hợp đồng</Text>
      </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Đang tải hợp đồng...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} scrollEnabled={!isSigning}>
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            style={{ height: docHeight }}
            injectedJavaScript={injected}
            onMessage={(e) => {
              const h = Number(e?.nativeEvent?.data || 0);
              if (!Number.isNaN(h) && h > 0) {
                const clamped = Math.max(100, Math.min(h, 4000));
                if (clamped !== docHeight) setDocHeight(clamped);
              }
            }}
            scrollEnabled={false}
          />

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <View style={{ height: 220, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <Signature
                ref={signatureRef}
                onOK={(sig: string) => { setSignatureDataUrl(sig); try { pendingSigResolve.current?.(sig); pendingSigResolve.current = null; } catch {} }}
                onClear={() => setSignatureDataUrl(null)}
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
                onPress={() => { try { signatureRef.current?.clearSignature?.(); } catch {} setSignatureDataUrl(null); }}
                style={{ flex: 1, backgroundColor: '#eee', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 }}
              >
                <Text style={{ color: '#000', fontWeight: '700' }}>Xóa chữ ký</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} disabled={isUploading} style={{ flex: 1, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 8 }}>
                {isUploading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Ký và đặt hàng</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* PDF Viewer (proxy endpoint to avoid 401) */}
      {showPdfModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <TouchableOpacity onPress={() => setShowPdfModal(false)} style={{ padding: 6 }}>
              <Text>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000' }}>Hợp đồng PDF</Text>
            <View style={{ width: 48 }} />
          </View>
          <View style={{ flex: 1 }}>
            {pdfLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <ActivityIndicator />
              </View>
            )}
            <WebView
              originWhitelist={["*"]}
              source={{ uri: `${API_URL}/api/contracts/${contractId}/pdf`, headers: { Authorization: `Bearer ${accessToken}` } }}
              onLoadEnd={() => setPdfLoading(false)}
              startInLoadingState
              style={{ flex: 1 }}
              allowsBackForwardNavigationGestures
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

