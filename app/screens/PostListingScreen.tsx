// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function PostListingScreen() {
    const { accessToken, logout } = useAuth();
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: 'vehicle',
        brand: '',
        model: '',
        year: '',
        condition: 'used',
        length: '',
        width: '',
        height: '',
        weight: '',
        specifications: {
            batteryCapacity: '',
            range: '',
            chargingTime: '',
            power: '',
            batteryType: '',
            voltage: '',
            capacity: '',
            cycleLife: '',
            operatingTemperature: '',
            warranty: '',
            compatibility: ''
        }
    });
    const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<any>(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiCache, setAiCache] = useState<{ key: string; response: any } | null>(null);

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const guessMimeFromUri = (uri: string, fallback: 'image' | 'video') => {
        const lower = (uri || '').toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.heic')) return 'image/heic';
        if (lower.endsWith('.webp')) return 'image/webp';
        if (lower.endsWith('.gif')) return 'image/gif';
        if (lower.endsWith('.mp4')) return 'video/mp4';
        if (lower.endsWith('.mov')) return 'video/quicktime';
        if (fallback === 'video') return 'video/mp4';
        return 'image/jpeg';
    };

    const pickMedia = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 10,
            });

            if (!result.canceled && result.assets.length > 0) {
                const picked = result.assets.map((asset, index) => {
                    const kind = (asset.type as any) === 'video' ? 'video' : 'image';
                    const mime = (asset as any).mimeType || guessMimeFromUri(asset.uri, kind);
                    const nameBase = kind === 'video' ? 'video' : 'image';
                    return {
                        uri: asset.uri,
                        type: kind,
                        mime,
                        name: `${nameBase}_${Date.now()}_${index}.${mime.includes('/') ? mime.split('/')[1] : 'bin'}`,
                    };
                });
                console.log('Selected media:', picked);
                setSelectedMedia(picked);
            }
        } catch (error) {
            console.log('Image picker error:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const removeMedia = (index: number) => {
        const newItems = selectedMedia.filter((_, i) => i !== index);
        setSelectedMedia(newItems);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!formData.title || !formData.price) {
            Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và giá bán');
            return;
        }
        const yearNum = formData.year ? Number(formData.year) : undefined;
        const priceNum = Number(String(formData.price).replace(/[^0-9.]/g, ''));
        if (Number.isNaN(priceNum)) {
            Alert.alert('Lỗi', 'Giá không hợp lệ');
            return;
        }
        // Dimensions and weight (required by server)
        const lengthNum = Number(formData.length);
        const widthNum = Number(formData.width);
        const heightNum = Number(formData.height);
        const weightNum = Number(formData.weight);
        if ([lengthNum, widthNum, heightNum, weightNum].some((v) => Number.isNaN(v))) {
            Alert.alert('Lỗi', 'Kích thước/khối lượng không hợp lệ');
            return;
        }
        if (lengthNum < 1 || lengthNum > 200 || widthNum < 1 || widthNum > 200 || heightNum < 1 || heightNum > 200) {
            Alert.alert('Lỗi', 'Chiều dài/rộng/cao phải trong khoảng 1-200 cm');
            return;
        }
        if (weightNum < 1 || weightNum > 1600000) {
            Alert.alert('Lỗi', 'Khối lượng (gram) phải trong khoảng 1 - 1,600,000');
            return;
        }
        if (selectedMedia.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 ảnh hoặc video sản phẩm');
            return;
        }

        const form = new FormData();
        form.append('title', formData.title);
        if (formData.description) form.append('description', formData.description);
        form.append('price', String(priceNum));
        form.append('category', formData.category);
        if (formData.brand) form.append('brand', formData.brand);
        if (formData.model) form.append('model', formData.model);
        if (yearNum) form.append('year', String(yearNum));
        form.append('condition', formData.condition);
        // Required dims/weight
        form.append('length', String(lengthNum));
        form.append('width', String(widthNum));
        form.append('height', String(heightNum));
        form.append('weight', String(weightNum));
        // Send specs as optional JSON string field
        try {
            const specKeys = Object.keys(formData.specifications || {});
            const hasAnySpec = specKeys.some(k => (formData.specifications as any)[k]);
            if (hasAnySpec) {
                form.append('specifications', JSON.stringify(formData.specifications));
            }
        } catch {}

        selectedMedia.forEach((item, index) => {
            form.append('files', {
                uri: item.uri,
                type: item.mime,
                name: item.name || `media_${index}`,
            } as any);
        });

        try {
            setSubmitting(true);
            setErrors({});
            console.log('Sending product multipart with media count:', selectedMedia.length);
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: form,
            });
            if (res.status === 401) {
                await logout();
                return;
            }
            const raw = await res.text();
            console.log('Product creation response status:', res.status);
            console.log('Product creation response:', raw);
            let data: any = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch {}
            if (!res.ok) {
                // Map zod issues -> field errors
                if (res.status === 400) {
                    const details = Array.isArray(data?.details) ? data.details : [];
                    if (details.length > 0) {
                        const mapped: Record<string, string> = {};
                        details.forEach((iss: any) => {
                            const path = Array.isArray(iss?.path) && iss.path.length ? iss.path[0] : '';
                            const key = typeof path === 'string' ? path : '';
                            if (key && !mapped[key]) mapped[key] = iss?.message || 'Trường không hợp lệ';
                        });
                        setErrors(mapped);
                    }
                    const msg = data?.error || 'Dữ liệu không hợp lệ';
                    Alert.alert('Lỗi', msg);
            return;
        }
                throw new Error(data?.message || data?.error || 'Không thể tạo sản phẩm');
            }
            // Success: navigate to ProductContractEditor with the created product ID
            const created = data?.data || data?.product || data || {};
            const createdId = created?._id || created?.id;
            Alert.alert('Thành công', 'Tin đăng đã được tạo thành công');
            try {
                if (createdId) {
                    (navigation as any).navigate('ProductContractEditor', {
                        productId: createdId,
                        productTitle: created?.title || String(formData.title || 'Sản phẩm')
                    });
                }
            } catch {}
        } catch (e: any) {
            console.log('Product creation error:', e);
            Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Format number với dấu phẩy ngăn cách hàng nghìn
     */
    const formatPrice = (price: number): string => {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    /**
     * Tạo cache key từ request data để kiểm tra xem có cần gọi API không
     */
    const generateCacheKey = (data: any): string => {
        const normalizedSpecs = data.specifications ? Object.keys(data.specifications)
            .sort()
            .map(key => `${key}:${String(data.specifications[key]).trim()}`)
            .join('|') : '';
        
        return JSON.stringify({
            title: data.title?.trim().toLowerCase(),
            description: data.description?.trim().toLowerCase(),
            category: data.category,
            brand: data.brand?.trim().toLowerCase(),
            model: data.model?.trim().toLowerCase(),
            year: data.year,
            condition: data.condition,
            specs: normalizedSpecs
        });
    };

    /**
     * Format text có markdown bold (**text**) thành bold
     * Trả về một Text component với nested Text children
     */
    const renderFormattedText = (text: string): React.ReactNode => {
        if (!text) return <Text> </Text>;
        
        const parts: React.ReactNode[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = boldRegex.exec(text)) !== null) {
            // Text trước phần bold
            if (match.index > lastIndex) {
                parts.push(
                    <Text key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</Text>
                );
            }
            // Phần bold
            parts.push(
                <Text key={`bold-${key++}`} style={{ fontWeight: 'bold' }}>
                    {match[1]}
                </Text>
            );
            lastIndex = match.index + match[0].length;
        }
        
        // Text còn lại
        if (lastIndex < text.length) {
            parts.push(
                <Text key={`text-${key++}`}>{text.substring(lastIndex)}</Text>
            );
        }

        return parts.length > 0 ? <Text>{parts}</Text> : <Text>{text}</Text>;
    };

    const handleAIPriceSuggestion = async () => {
        // Validate required fields
        const missingFields: string[] = [];
        
        if (!formData.title || formData.title.trim().length < 5) {
            missingFields.push('Tên sản phẩm (tối thiểu 5 ký tự)');
        }
        if (!formData.description || formData.description.trim().length < 10) {
            missingFields.push('Mô tả chi tiết (tối thiểu 10 ký tự)');
        }
        if (!formData.brand || formData.brand.trim().length === 0) {
            missingFields.push('Thương hiệu');
        }
        if (!formData.model || formData.model.trim().length === 0) {
            missingFields.push('Model sản phẩm');
        }
        if (!formData.year || !formData.year.trim()) {
            missingFields.push('Năm sản xuất');
        }

        if (missingFields.length > 0) {
            Alert.alert(
                'Thông tin cần bổ sung',
                `Vui lòng điền đầy đủ các thông tin sau:\n\n${missingFields.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nSau đó thử lại.`,
                [{ text: 'Đã hiểu', style: 'default' }]
            );
            return;
        }

        try {
            // Prepare request data
            const requestData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                brand: formData.brand.trim(),
                model: formData.model.trim(),
                year: Number(formData.year),
                condition: formData.condition,
            };

            // Add specifications if any
            const specs: any = {};
            if (formData.specifications.batteryCapacity) specs.batteryCapacity = formData.specifications.batteryCapacity;
            if (formData.specifications.range) specs.range = formData.specifications.range;
            if (formData.specifications.chargingTime) specs.chargingTime = formData.specifications.chargingTime;
            if (formData.specifications.power) specs.power = formData.specifications.power;
            if (formData.specifications.maxSpeed) specs.maxSpeed = formData.specifications.maxSpeed;
            if (formData.specifications.batteryType) specs.batteryType = formData.specifications.batteryType;
            if (formData.specifications.voltage) specs.voltage = formData.specifications.voltage;
            if (formData.specifications.capacity) specs.capacity = formData.specifications.capacity;
            if (formData.specifications.cycleLife) specs.cycleLife = formData.specifications.cycleLife;
            if (formData.specifications.warranty) specs.warranty = formData.specifications.warranty;
            if (formData.specifications.compatibility) specs.compatibility = formData.specifications.compatibility;
            
            if (Object.keys(specs).length > 0) {
                requestData.specifications = specs;
            }

            // Generate cache key from request data
            const cacheKey = generateCacheKey(requestData);

            // Check if we have cached response for this data
            if (aiCache && aiCache.key === cacheKey) {
                console.log('📦 Using cached AI response');
                setAiResponse(aiCache.response);
                setShowAiModal(true);
                return;
            }

            // Data has changed, need to call API
            console.log('🔄 Data changed, calling API...');
            setAiLoading(true);

            const response = await fetch(`${API_URL}/api/products/suggest-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify(requestData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    await logout();
                    return;
                }
                const errorMsg = responseData?.error || responseData?.message || 'Không thể lấy gợi ý giá từ AI';
                Alert.alert('Lỗi', errorMsg);
                return;
            }

            if (responseData.success && responseData.data) {
                // Cache the response
                setAiCache({ key: cacheKey, response: responseData.data });
                setAiResponse(responseData.data);
                setShowAiModal(true);
            } else {
                Alert.alert('Lỗi', 'Không nhận được dữ liệu từ AI');
            }
        } catch (error: any) {
            console.error('AI price suggestion error:', error);
            Alert.alert('Lỗi', error?.message || 'Có lỗi xảy ra khi gọi AI. Vui lòng thử lại sau.');
        } finally {
            setAiLoading(false);
        }
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const renderInput = (label, value, onChange, required = false, keyboardType = 'default', placeholder, errorKey?: string) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[styles.input, errors[errorKey || ''] ? { borderColor: '#FF3333' } : null]}
                placeholder={placeholder || label}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChange}
                keyboardType={keyboardType}
            />
            {!!(errorKey && errors[errorKey]) && (
                <Text style={styles.errorText}>{errors[errorKey]}</Text>
            )}
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Đăng tin</Text>
                    <TouchableOpacity style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Lưu nháp</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={styles.keyboardAvoid}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Info Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>THÔNG TIN SẢN PHẨM</Text>
                            <Text style={styles.infoText}>Điền các thông tin cơ bản của sản phẩm.</Text>
                        </View>

                        {/* Image Upload */}
                        <View style={styles.section}>
                            <View style={styles.imageInfo}>
                                <Ionicons name="information-circle" size={20} color="#007AFF" />
                                <Text style={styles.imageInfoText}>Hình ảnh hợp lệ (tối đa 10 ảnh)</Text>
                            </View>
                            
                            {selectedMedia.length > 0 ? (
                                <View style={styles.imageGrid}>
                                    <FlatList
                                        data={selectedMedia}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.imageItem}>
                                                {item.type === 'image' ? (
                                                    <Image source={{ uri: item.uri }} style={styles.uploadedImage} />
                                                ) : (
                                                    <View style={[styles.uploadedImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }]}>
                                                        <Ionicons name="videocam" size={28} color="#FFD700" />
                                                        <Text style={{ color: '#fff', marginTop: 6, fontSize: 12 }}>Video</Text>
                                                    </View>
                                                )}
                                                <TouchableOpacity 
                                                    style={styles.removeImageButton}
                                                    onPress={() => removeMedia(index)}
                                                >
                                                    <Ionicons name="close" size={16} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        keyExtractor={(item, index) => index.toString()}
                                        numColumns={3}
                                        scrollEnabled={false}
                                    />
                            </View>
                            ) : null}
                            
                            <TouchableOpacity 
                                style={[styles.imageUpload, submitting && styles.uploadingButton]} 
                                onPress={pickMedia}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <Ionicons name="cloud-upload" size={48} color="#FFD700" />
                                ) : (
                                <Ionicons name="camera" size={48} color="#FFD700" />
                                )}
                                <Text style={styles.imageUploadText}>
                                    {submitting ? 'ĐANG GỬI...' : 'CHỌN ẢNH/VIDEO SẢN PHẨM'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Core Fields */}
                        <View style={styles.section}>
                            {renderInput('Tên sản phẩm', formData.title, (t) => updateFormData('title', t), true, 'default', 'VD: Xe điện VinFast VF5/Pin Lithium 48V', 'title')}
                            {renderInput('Mô tả chi tiết', formData.description, (t) => updateFormData('description', t), false, 'default', 'VD: Xe điện tốc độ 70 km/h...', 'description')}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Giá bán (VNĐ) <Text style={styles.required}>*</Text></Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }, errors.price ? { borderColor: '#FF3333' } : null]}
                                        placeholder="Nhập giá bán"
                                        placeholderTextColor="#999"
                                        value={String(formData.price)}
                                        onChangeText={(t) => updateFormData('price', t)}
                                        keyboardType="numeric"
                                    />
                                    {!!errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
                                    <TouchableOpacity 
                                        style={[styles.aiButton, { height: 44 }, aiLoading && styles.aiButtonDisabled]} 
                                        onPress={handleAIPriceSuggestion}
                                        disabled={aiLoading}
                                    >
                                        {aiLoading ? (
                                            <ActivityIndicator size="small" color="#FF6B35" />
                                        ) : (
                                            <>
                                                <Ionicons name="sparkles" size={16} color="#FF6B35" />
                                                <Text style={styles.aiButtonText}>AI giá</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            {/* Dimensions & Weight (required) */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Kích thước & Khối lượng <Text style={styles.required}>*</Text></Text>
                                {renderInput('Chiều dài (cm)', String(formData.length), (t) => updateFormData('length', t), true, 'numeric', 'VD: 150', 'length')}
                                {renderInput('Chiều rộng (cm)', String(formData.width), (t) => updateFormData('width', t), true, 'numeric', 'VD: 60', 'width')}
                                {renderInput('Chiều cao (cm)', String(formData.height), (t) => updateFormData('height', t), true, 'numeric', 'VD: 90', 'height')}
                                {renderInput('Khối lượng (gram)', String(formData.weight), (t) => updateFormData('weight', t), true, 'numeric', 'VD: 50000', 'weight')}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Loại sản phẩm <Text style={styles.required}>*</Text></Text>
                                <View style={styles.categoryButtons}>
                                <TouchableOpacity
                                        style={[styles.categoryButton, formData.category === 'vehicle' && styles.activeCategory]}
                                        onPress={() => updateFormData('category', 'vehicle')}
                                >
                                        <Text style={[styles.categoryText, formData.category === 'vehicle' && styles.activeCategoryText]}>Xe điện</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                        style={[styles.categoryButton, formData.category === 'battery' && styles.activeCategory]}
                                        onPress={() => updateFormData('category', 'battery')}
                                >
                                        <Text style={[styles.categoryText, formData.category === 'battery' && styles.activeCategoryText]}>Pin xe điện</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                            {renderInput('Thương hiệu', formData.brand, (t) => updateFormData('brand', t), false, 'default', 'VD: VinFast, Tesla, CATL...', 'brand')}
                            {renderInput('Model sản phẩm', formData.model, (t) => updateFormData('model', t), false, 'default', 'VD: VF5, Evo200, LFP-48V...', 'model')}
                            {renderInput('Năm sản xuất', formData.year, (t) => updateFormData('year', t), false, 'numeric', 'VD: 2023', 'year')}

                            <Text style={styles.label}>Tình trạng <Text style={styles.required}>*</Text></Text> 
                            <View style={styles.conditionButtons}>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'used' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'used')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'used' && styles.activeConditionText]}>Đã qua sử dụng</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'refurbished' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'refurbished')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'refurbished' && styles.activeConditionText]}>Tân trang</Text>
                                </TouchableOpacity>
                            </View>
                            {!!errors.condition && <Text style={styles.errorText}>{errors.condition}</Text>}
                           
                        </View>


                        {/* Specifications */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>THÔNG SỐ KỸ THUẬT</Text>
                            
                            {/* Common fields for both categories */}
                            {renderInput('Dung lượng pin', formData.specifications.batteryCapacity, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, batteryCapacity: t } })), false, 'default', 'VD: 3.5 kWh')}
                            {renderInput('Điện áp', formData.specifications.voltage, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, voltage: t } })), false, 'default', 'VD: 48V')}
                            {renderInput('Dung lượng', formData.specifications.capacity, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, capacity: t } })), false, 'default', 'VD: 34.6 Ah')}
                            {renderInput('Loại pin', formData.specifications.batteryType, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, batteryType: t } })), false, 'default', 'VD: LFP, NMC...')}
                            {renderInput('Chu kỳ sạc', formData.specifications.cycleLife, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, cycleLife: t } })), false, 'default', 'VD: 2,000 chu kỳ sạc')}
                            {renderInput('Nhiệt độ hoạt động', formData.specifications.operatingTemperature, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, operatingTemperature: t } })), false, 'default', 'VD: -10°C đến 45°C')}
                            {renderInput('Bảo hành', formData.specifications.warranty, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, warranty: t } })), false, 'default', formData.category === 'vehicle' ? 'VD: 3 năm hoặc 30,000 km' : 'VD: 2 năm hoặc 1,000 chu kỳ')}
                            {renderInput('Tương thích', formData.specifications.compatibility, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, compatibility: t } })), false, 'default', formData.category === 'vehicle' ? 'VD: Tương thích trạm sạc VinFast' : 'VD: Tương thích xe VinFast Evo200, xe điện 48V...')}
                            
                            {/* Vehicle-specific fields */}
                            {formData.category === 'vehicle' && (
                                <>
                                    {renderInput('Quãng đường', formData.specifications.range, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, range: t } })), false, 'default', 'VD: 203 km')}
                                    {renderInput('Thời gian sạc', formData.specifications.chargingTime, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, chargingTime: t } })), false, 'default', 'VD: 6-7 giờ')}
                                    {renderInput('Công suất', formData.specifications.power, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, power: t } })), false, 'default', 'VD: 2,500 W')}
                                   
                                </>
                            )}
                            
                            {/* Battery-specific fields */}
                            {formData.category === 'battery' && (
                                <>
                                    {renderInput('Thời gian sạc', formData.specifications.chargingTime, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, chargingTime: t } })), false, 'default', 'VD: 6-7 giờ (nếu có)')}
                                </>
                            )}
                            </View>

                        {/* Submit */}
                        <View style={styles.section}>      
                                    <TouchableOpacity 
                                style={[styles.submitButton, submitting ? { opacity: 0.6 } : null]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                <Text style={styles.submitButtonText}>Đăng tin</Text>
                                )}
                            </TouchableOpacity>
                        </View>


                        
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* AI Price Suggestion Modal */}
                <Modal
                    visible={showAiModal}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setShowAiModal(false)}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🤖 AI Gợi ý Giá</Text>
                            <TouchableOpacity onPress={() => setShowAiModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {aiResponse && (
                                <>
                                    {/* Price Range */}
                                    <View style={styles.priceCard}>
                                        <Text style={styles.priceCardTitle}>💰 Mức Giá Đề Xuất</Text>
                                        <Text style={styles.suggestedPrice}>
                                            {formatPrice(aiResponse.suggestedPrice)} VNĐ
                                        </Text>
                                        
                                        <View style={styles.priceRangeContainer}>
                                            <View style={styles.priceRangeItem}>
                                                <Text style={styles.priceRangeLabel}>Thấp</Text>
                                                <Text style={styles.priceRangeValue}>
                                                    {formatPrice(aiResponse.priceRange.low)} VNĐ
                                                </Text>
                                            </View>
                                            <View style={styles.priceRangeItem}>
                                                <Text style={[styles.priceRangeLabel, { color: '#FF6B35', fontWeight: 'bold' }]}>Đề xuất</Text>
                                                <Text style={[styles.priceRangeValue, { color: '#FF6B35', fontWeight: 'bold' }]}>
                                                    {formatPrice(aiResponse.priceRange.recommended)} VNĐ
                                                </Text>
                                            </View>
                                            <View style={styles.priceRangeItem}>
                                                <Text style={styles.priceRangeLabel}>Cao</Text>
                                                <Text style={styles.priceRangeValue}>
                                                    {formatPrice(aiResponse.priceRange.high)} VNĐ
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Warnings */}
                                    {aiResponse.warnings && aiResponse.warnings.length > 0 && (
                                        <View style={styles.warningCard}>
                                            <View style={styles.warningHeader}>
                                                <Ionicons name="warning" size={20} color="#FF6B35" />
                                                <Text style={styles.warningTitle}>⚠️ Cảnh báo</Text>
                                            </View>
                                            {aiResponse.warnings.map((warning: string, index: number) => (
                                                <Text key={index} style={styles.warningText}>
                                                    • {warning}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Reasoning */}
                                    {aiResponse.reasoning && (
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoCardTitle}>📊 Lý Do Đề Xuất</Text>
                                            
                                            <View style={styles.reasoningItem}>
                                                <Text style={styles.reasoningLabel}>Giá thấp:</Text>
                                                <Text style={styles.reasoningText}>
                                                    {renderFormattedText(aiResponse.reasoning.low)}
                                                </Text>
                                            </View>
                                            
                                            <View style={styles.reasoningItem}>
                                                <Text style={styles.reasoningLabel}>Giá đề xuất:</Text>
                                                <Text style={styles.reasoningText}>
                                                    {renderFormattedText(aiResponse.reasoning.recommended)}
                                                </Text>
                                            </View>
                                            
                                            <View style={styles.reasoningItem}>
                                                <Text style={styles.reasoningLabel}>Giá cao:</Text>
                                                <Text style={styles.reasoningText}>
                                                    {renderFormattedText(aiResponse.reasoning.high)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Market Analysis */}
                                    {aiResponse.marketAnalysis && (
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoCardTitle}>📈 Phân Tích Thị Trường</Text>
                                            <Text style={styles.infoCardText}>
                                                {renderFormattedText(aiResponse.marketAnalysis)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Factors */}
                                    {aiResponse.factors && aiResponse.factors.length > 0 && (
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoCardTitle}>🔍 Yếu Tố Ảnh Hưởng</Text>
                                            {aiResponse.factors.map((factor: string, index: number) => (
                                                <Text key={index} style={styles.factorItem}>
                                                    • {factor}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Tips */}
                                    {aiResponse.tips && aiResponse.tips.length > 0 && (
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoCardTitle}>💡 Lời Khuyên</Text>
                                            {aiResponse.tips.map((tip: string, index: number) => (
                                                <Text key={index} style={styles.tipItem}>
                                                    {renderFormattedText(tip)}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Recommendation if inconsistent */}
                                    {aiResponse.dataQuality && !aiResponse.dataQuality.isConsistent && aiResponse.dataQuality.recommendation && (
                                        <View style={styles.recommendationCard}>
                                            <Text style={styles.recommendationTitle}>💬 Gợi ý</Text>
                                            <Text style={styles.recommendationText}>
                                                {aiResponse.dataQuality.recommendation}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Action Buttons */}
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={styles.modalCancelButton}
                                            onPress={() => setShowAiModal(false)}
                                        >
                                            <Text style={styles.modalCancelButtonText}>Đóng</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.modalApplyButton}
                                            onPress={() => {
                                                if (aiResponse?.suggestedPrice) {
                                                    updateFormData('price', String(aiResponse.suggestedPrice));
                                                    setShowAiModal(false);
                                                    Alert.alert('✅ Thành công', 'Giá AI gợi ý đã được áp dụng!');
                                                }
                                            }}
                                        >
                                            <Text style={styles.modalApplyButtonText}>
                                                Sử dụng giá đề xuất
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardAvoid: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',

    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        paddingLeft: 130,
    },
    saveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
    },
    saveButtonText: {
        fontSize: 14,
        color: '#666',
    },
    content: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    link: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
    imageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    imageInfoText: {
        fontSize: 14,
        color: '#007AFF',
        marginLeft: 8,
    },
    imageUpload: {
        borderWidth: 2,
        borderColor: '#FFD700',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 32,
        alignItems: 'center',
    },
    imageUploadText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginTop: 8,
    },
    conditionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    conditionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    activeCondition: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    conditionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeConditionText: {
        color: '#000',
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    required: {
        color: '#FF3333',
        fontWeight: 'bold',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 16,
        color: '#000',
    },
    placeholder: {
        color: '#999',
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        fontSize: 16,
        color: '#000000',
        backgroundColor: '#ffffff',
        fontWeight: '500',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    sellerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    sellerButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    activeSellerButton: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    sellerButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeSellerButtonText: {
        color: '#000',
        fontWeight: '600',
    },
    buttonSection: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        marginBottom: 100,
    },
    previewButton: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    previewButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    submitButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#FFD700',
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
    },
    priceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FF6B35',
    },
    aiButtonText: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
        marginLeft: 4,
    },
    imageGrid: {
        marginBottom: 16,
    },
    imageItem: {
        position: 'relative',
        margin: 4,
        width: '30%',
        aspectRatio: 1,
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingButton: {
        opacity: 0.7,
    },
    categoryButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    categoryButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    activeCategory: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    categoryText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeCategoryText: {
        color: '#000',
        fontWeight: '600',
    },
    aiButtonDisabled: {
        opacity: 0.6,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    priceCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FF6B35',
    },
    priceCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
    },
    suggestedPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginBottom: 16,
        textAlign: 'center',
    },
    priceRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
    },
    priceRangeItem: {
        alignItems: 'center',
        flex: 1,
    },
    priceRangeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    priceRangeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    warningCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginLeft: 8,
    },
    warningText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginTop: 4,
    },
    infoCard: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    infoCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    infoCardText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    reasoningItem: {
        marginBottom: 16,
    },
    reasoningLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    reasoningText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    factorItem: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    recommendationCard: {
        backgroundColor: '#E8F4F8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    recommendationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 8,
    },
    recommendationText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 32,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    modalApplyButton: {
        flex: 2,
        paddingVertical: 14,
        backgroundColor: '#FF6B35',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalApplyButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});
