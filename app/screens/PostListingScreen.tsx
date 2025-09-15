// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
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
    const { accessToken } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: 'vehicle',
        brand: '',
        model: '',
        year: '',
        condition: 'new',
        imagesInput: '',
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

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
        const images = (formData.imagesInput || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const payload: any = {
            title: formData.title,
            description: formData.description,
            price: priceNum,
            category: 'vehicle',
            brand: formData.brand || undefined,
            model: formData.model || undefined,
            year: yearNum || undefined,
            condition: formData.condition,
            images,
            specifications: { ...formData.specifications },
        };
        try {
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            const raw = await res.text();
            let data: any = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch {}
            if (!res.ok) {
                throw new Error(data?.message || 'Không thể tạo sản phẩm');
            }
            Alert.alert('Thành công', 'Tin đăng đã được tạo thành công');
        } catch (e: any) {
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
                                <Text style={styles.imageInfoText}>Hình ảnh hợp lệ</Text>
                            </View>
                            <TouchableOpacity style={styles.imageUpload}>
                                <Ionicons name="camera" size={48} color="#FFD700" />
                                <Text style={styles.imageUploadText}>ĐĂNG TỪ 01 ĐẾN 06 HÌNH</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Core Fields */}
                        <View style={styles.section}>
                            {renderInput('Tiêu đề', formData.title, (t) => updateFormData('title', t), true, 'default', 'VD: Tesla Model 3 2023...')}
                            {renderInput('Mô tả', formData.description, (t) => updateFormData('description', t), false, 'default', 'Mô tả chi tiết...')}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Giá (VND) <Text style={styles.required}>*</Text></Text>
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
                            {renderInput('Thương hiệu', formData.brand, (t) => updateFormData('brand', t))}
                            {renderInput('Model', formData.model, (t) => updateFormData('model', t))}
                            {renderInput('Năm', formData.year, (t) => updateFormData('year', t), false, 'numeric')}

                            <Text style={styles.label}>Tình trạng</Text>
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

                            {renderInput('Ảnh (URL, cách nhau bởi dấu phẩy)', formData.imagesInput, (t) => updateFormData('imagesInput', t), false, 'default', 'https://..., https://...')}
                        </View>

                        {/* Specifications */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>THÔNG SỐ KỸ THUẬT</Text>
                            {renderInput('Dung lượng pin', formData.specifications.batteryCapacity, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, batteryCapacity: t } })))}
                            {renderInput('Quãng đường', formData.specifications.range, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, range: t } })))}
                            {renderInput('Thời gian sạc', formData.specifications.chargingTime, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, chargingTime: t } })))}
                            {renderInput('Công suất', formData.specifications.power, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, power: t } })))}
                            {renderInput('Khối lượng', formData.specifications.weight, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, weight: t } })))}
                            {renderInput('Kích thước', formData.specifications.dimensions, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, dimensions: t } })))}
                            {renderInput('Loại pin', formData.specifications.batteryType, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, batteryType: t } })))}
                            {renderInput('Điện áp', formData.specifications.voltage, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, voltage: t } })))}
                            {renderInput('Dung lượng', formData.specifications.capacity, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, capacity: t } })))}
                            {renderInput('Chu kỳ sạc', formData.specifications.cycleLife, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, cycleLife: t } })))}
                            {renderInput('Nhiệt độ hoạt động', formData.specifications.operatingTemperature, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, operatingTemperature: t } })))}
                            {renderInput('Bảo hành', formData.specifications.warranty, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, warranty: t } })))}
                            {renderInput('Tương thích', formData.specifications.compatibility, (t) => setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, compatibility: t } })))}
                        </View>

                        {/* Submit */}
                        <View style={styles.section}>
                            <View style={styles.priceHeader}>
                                <TouchableOpacity 
                                    style={styles.aiButton}
                                    onPress={handleAIPriceSuggestion}
                                >
                                    <Ionicons name="sparkles" size={16} color="#FF6B35" />
                                    <Text style={styles.aiButtonText}>AI gợi ý giá</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.buttonSection}>
                                <TouchableOpacity style={styles.previewButton}>
                                    <Text style={styles.previewButtonText}>Xem trước</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                    <Text style={styles.submitButtonText}>Đăng tin</Text>
                                </TouchableOpacity>
                            </View>
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
});
