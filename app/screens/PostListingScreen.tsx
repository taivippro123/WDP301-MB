// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
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

export default function PostListingScreen() {
    const { accessToken, logout } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: 'vehicle',
        brand: '',
        model: '',
        year: '',
        condition: 'new',
        specifications: {
            batteryCapacity: '',
            range: '',
            chargingTime: '',
            power: '',
            weight: '',
            dimensions: '',
            batteryType: '',
            voltage: '',
            capacity: '',
            cycleLife: '',
            operatingTemperature: '',
            warranty: '',
            compatibility: ''
        }
    });
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const uploadProductImages = async (imageUris: string[]) => {
        setUploadingImages(true);
        try {
            const formData = new FormData();
            
            // Add each image file to FormData
            imageUris.forEach((uri, index) => {
                formData.append('files', {
                    uri: uri,
                    type: 'image/jpeg',
                    name: `product_${index}.jpg`,
                } as any);
            });

            console.log('Uploading images:', imageUris);

            const response = await fetch(`${API_URL}/api/upload/product`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: formData,
            });
            if (response.status === 401) {
                await logout();
                return;
            }

            console.log('Upload response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Upload error response:', errorText);
                throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Upload response data:', result);
            
            // Handle different possible response formats
            let urls = [];
            if (result.urls) {
                urls = result.urls;
            } else if (result.files) {
                urls = result.files;
            } else if (Array.isArray(result)) {
                urls = result;
            } else if (result.data && Array.isArray(result.data)) {
                urls = result.data;
            } else {
                console.log('Unexpected response format:', result);
                throw new Error('Định dạng phản hồi không hợp lệ');
            }
            
            setSelectedImages(urls);
            Alert.alert('Thành công', `Đã tải lên ${urls.length} ảnh`);
        } catch (error: any) {
            console.log('Upload error:', error);
            Alert.alert('Lỗi', error.message || 'Không thể tải lên ảnh');
        } finally {
            setUploadingImages(false);
        }
    };

    const pickImages = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 10,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uris = result.assets.map(asset => asset.uri);
                console.log('Selected images:', uris);
                await uploadProductImages(uris);
            }
        } catch (error) {
            console.log('Image picker error:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const removeImage = (index: number) => {
        const newImages = selectedImages.filter((_, i) => i !== index);
        setSelectedImages(newImages);
    };

    const handleSubmit = async () => {
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
        // Use only uploaded images
        const images = selectedImages;
        
        console.log('Images to send to API:', images);
        
        if (images.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng tải lên ít nhất 1 ảnh sản phẩm');
            return;
        }
        const payload: any = {
            title: formData.title,
            description: formData.description,
            price: priceNum,
            category: formData.category,
            brand: formData.brand || undefined,
            model: formData.model || undefined,
            year: yearNum || undefined,
            condition: formData.condition,
            images,
            specifications: { ...formData.specifications },
        };
        try {
            console.log('Sending product payload:', payload);
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify(payload),
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
                throw new Error(data?.message || data?.error || 'Không thể tạo sản phẩm');
            }
            Alert.alert('Thành công', 'Tin đăng đã được tạo thành công');
        } catch (e: any) {
            console.log('Product creation error:', e);
            Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra');
        }
    };

    const handleAIPriceSuggestion = () => {
        if (!formData.brand || !formData.model) {
            Alert.alert(
                'Thông tin thiếu',
                'Vui lòng nhập Thương hiệu và Model trước khi dùng AI gợi ý giá.'
            );
            return;
        }

        // Simulate AI processing
        Alert.alert(
            'AI đang phân tích...',
            'Vui lòng chờ ít giây để AI phân tích thị trường và đưa ra gợi ý giá.',
            [
                {
                    text: 'Hủy',
                    style: 'cancel'
                },
                {
                    text: 'Đồng ý',
                    onPress: () => {
                        // Simulate AI price suggestion based on category and vehicle type
                        setTimeout(() => {
                            let suggestedPrice = '';
                            const brand = (formData.brand || '').toLowerCase();
                            const model = (formData.model || '').toLowerCase();
                            
                            // AI price logic simulation
                            if (brand.includes('vinfast')) suggestedPrice = '35,000,000';
                            else if (brand.includes('honda')) suggestedPrice = '28,000,000';
                            else if (brand.includes('yamaha')) suggestedPrice = '25,000,000';
                            else if (brand.includes('tesla')) suggestedPrice = '2,300,000,000';
                            else if (brand.includes('byd')) suggestedPrice = '1,700,000,000';
                            else suggestedPrice = '50,000,000';

                            Alert.alert(
                                '🤖 AI Gợi ý giá',
                                `Dựa trên phân tích thị trường hiện tại:\n\n💰 Giá đề xuất: ${suggestedPrice} VNĐ\n\n📈 Đây là mức giá cạnh tranh dựa trên các sản phẩm tương tự đang bán trên thị trường.\n\nBạn có muốn sử dụng giá này không?`,
                                [
                                    {
                                        text: 'Không, cảm ơn',
                                        style: 'cancel'
                                    },
                                    {
                                        text: 'Sử dụng giá này',
                                        onPress: () => {
                                            updateFormData('price', suggestedPrice);
                                            Alert.alert('✅ Thành công', 'Giá AI gợi ý đã được áp dụng!');
                                        }
                                    }
                                ]
                            );
                        }, 1500); // Simulate AI processing time
                    }
                }
            ]
        );
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const renderInput = (label, value, onChange, required = false, keyboardType = 'default', placeholder) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={styles.input}
                placeholder={placeholder || label}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChange}
                keyboardType={keyboardType}
            />
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
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
                            
                            {selectedImages.length > 0 ? (
                                <View style={styles.imageGrid}>
                                    <FlatList
                                        data={selectedImages}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.imageItem}>
                                                <Image source={{ uri: item }} style={styles.uploadedImage} />
                                                <TouchableOpacity 
                                                    style={styles.removeImageButton}
                                                    onPress={() => removeImage(index)}
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
                                style={[styles.imageUpload, uploadingImages && styles.uploadingButton]} 
                                onPress={pickImages}
                                disabled={uploadingImages}
                            >
                                {uploadingImages ? (
                                    <Ionicons name="cloud-upload" size={48} color="#FFD700" />
                                ) : (
                                <Ionicons name="camera" size={48} color="#FFD700" />
                                )}
                                <Text style={styles.imageUploadText}>
                                    {uploadingImages ? 'ĐANG TẢI LÊN...' : 'CHỌN ẢNH SẢN PHẨM'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Core Fields */}
                        <View style={styles.section}>
                            {renderInput('Tên sản phẩm', formData.title, (t) => updateFormData('title', t), true, 'default', 'VD: Xe điện VinFast VF5/Pin Lithium 48V')}
                            {renderInput('Mô tả chi tiết', formData.description, (t) => updateFormData('description', t), false, 'default', 'VD: Xe điện tốc độ 70 km/h...')}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Giá bán (VNĐ) <Text style={styles.required}>*</Text></Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="Nhập giá bán"
                                        placeholderTextColor="#999"
                                        value={String(formData.price)}
                                        onChangeText={(t) => updateFormData('price', t)}
                                        keyboardType="numeric"
                                    />
                                    <TouchableOpacity 
                                        style={[styles.aiButton, { height: 44 }]} 
                                        onPress={handleAIPriceSuggestion}
                                    >
                                        <Ionicons name="sparkles" size={16} color="#FF6B35" />
                                        <Text style={styles.aiButtonText}>AI giá</Text>
                                    </TouchableOpacity>
                                </View>
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

                            {renderInput('Thương hiệu', formData.brand, (t) => updateFormData('brand', t), false, 'default', 'VD: VinFast, Tesla, CATL...')}
                            {renderInput('Model sản phẩm', formData.model, (t) => updateFormData('model', t), false, 'default', 'VD: VF5, Evo200, LFP-48V...')}
                            {renderInput('Năm sản xuất', formData.year, (t) => updateFormData('year', t), false, 'numeric', 'VD: 2023')}

                            <Text style={styles.label}>Tình trạng <Text style={styles.required}>*</Text></Text> 
                            <View style={styles.conditionButtons}>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'new' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'new')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'new' && styles.activeConditionText]}>Mới</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'used' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'used')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'used' && styles.activeConditionText]}>Đã qua sử dụng</Text>
                                </TouchableOpacity>
                            </View>
                           
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
                                    {renderInput('Khối lượng', formData.specifications.weight, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, weight: t } })), false, 'default', 'VD: 95 kg')}
                                    {renderInput('Kích thước', formData.specifications.dimensions, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, dimensions: t } })), false, 'default', 'VD: 1,800 x 700 x 1,130 mm')}
                                </>
                            )}
                            
                            {/* Battery-specific fields */}
                            {formData.category === 'battery' && (
                                <>
                                    {renderInput('Thời gian sạc', formData.specifications.chargingTime, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, chargingTime: t } })), false, 'default', 'VD: 6-7 giờ (nếu có)')}
                                    {renderInput('Khối lượng', formData.specifications.weight, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, weight: t } })), false, 'default', 'VD: 25 kg')}
                                    {renderInput('Kích thước', formData.specifications.dimensions, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, dimensions: t } })), false, 'default', 'VD: 400 x 250 x 180 mm')}
                                </>
                            )}
                            </View>

                        {/* Submit */}
                        <View style={styles.section}>      
                            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                <Text style={styles.submitButtonText}>Đăng tin</Text>
                            </TouchableOpacity>
                        </View>


                        
                    </ScrollView>
                </KeyboardAvoidingView>
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
        paddingLeft: 50,
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
});
