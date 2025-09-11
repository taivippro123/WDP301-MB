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

export default function PostListingScreen() {
    const [formData, setFormData] = useState({
        condition: 'used',
        category: '',
        vehicleType: '',
        engine: '',
        price: '',
        title: '',
        description: '',
        sellerType: 'individual',
        location: ''
    });

    const categories = ['Xe máy điện', 'Ô tô điện', 'Pin xe máy', 'Pin ô tô điện'];
    const vehicleTypes = ['VinFast', 'Honda', 'Yamaha', 'Tesla', 'BYD'];
    const engines = ['48V 20Ah', '60V 32Ah', '72V 40Ah', '87.7 kWh', '75 kWh'];

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.title || !formData.price || !formData.category) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        Alert.alert('Thành công', 'Tin đăng đã được gửi và đang chờ duyệt');
    };

    const handleAIPriceSuggestion = () => {
        if (!formData.category || !formData.vehicleType) {
            Alert.alert(
                'Thông tin thiếu',
                'Vui lòng điền đầy đủ thông tin trước khi sử dụng AI gợi ý giá.'
            );
            return;
        }

        // Simulate AI processing
        Alert.alert(
            'AI đang phân tích...',
            'Vui lòng chờ ít giây để AI phân tích thị trường và đưa ra gợi ý giá tốt nhất.',
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
                            const category = formData.category;
                            const vehicleType = formData.vehicleType;
                            
                            // AI price logic simulation
                            if (category === 'Xe máy điện') {
                                if (vehicleType === 'VinFast') suggestedPrice = '35,000,000';
                                else if (vehicleType === 'Honda') suggestedPrice = '28,000,000';
                                else if (vehicleType === 'Yamaha') suggestedPrice = '25,000,000';
                                else suggestedPrice = '30,000,000';
                            } else if (category === 'Ô tô điện') {
                                if (vehicleType === 'VinFast') suggestedPrice = '1,200,000,000';
                                else if (vehicleType === 'Tesla') suggestedPrice = '2,500,000,000';
                                else if (vehicleType === 'BYD') suggestedPrice = '1,800,000,000';
                                else suggestedPrice = '1,500,000,000';
                            } else if (category === 'Pin xe máy') {
                                suggestedPrice = '8,500,000';
                            } else if (category === 'Pin ô tô điện') {
                                suggestedPrice = '450,000,000';
                            } else {
                                suggestedPrice = '50,000,000';
                            }

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

    const renderDropdown = (label, value, field, required = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TouchableOpacity style={styles.dropdown}>
                <Text style={[styles.dropdownText, !value && styles.placeholder]}>
                    {value || `Chọn ${label.toLowerCase()}`}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
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
                            <Text style={styles.sectionTitle}>THÔNG TIN CHI TIẾT</Text>
                            <Text style={styles.infoText}>
                                Xem thêm về <Text style={styles.link}>Quy định đăng tin.</Text>
                            </Text>
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

                        {/* Condition */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tình trạng <Text style={styles.required}>*</Text></Text>
                            <View style={styles.conditionButtons}>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'used' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'used')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'used' && styles.activeConditionText]}>
                                        Còn mới dưới 90%
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.conditionButton, formData.condition === 'new' && styles.activeCondition]}
                                    onPress={() => updateFormData('condition', 'new')}
                                >
                                    <Text style={[styles.conditionText, formData.condition === 'new' && styles.activeConditionText]}>
                                        Còn mới trên 95%
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Form Fields */}
                        <View style={styles.section}>
                            {renderDropdown('Hãng xe', formData.category, 'category', true)}
                            {renderDropdown('Loại xe', formData.vehicleType, 'vehicleType', true)}
                            {renderDropdown('Động cơ', formData.engine, 'engine')}

                           
                        </View>

                        {/* Title and Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>TIÊU ĐỀ TIN ĐĂNG VÀ MÔ TẢ CHI TIẾT</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    Tiêu đề tin đăng <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="VD: Xe máy điện VinFast Klara A2 2023"
                                    placeholderTextColor="#999"
                                    value={formData.title}
                                    onChangeText={(text) => updateFormData('title', text)}
                                    maxLength={50}
                                />
                                <Text style={styles.charCount}>{formData.title.length}/50</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    Mô tả chi tiết <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="- Xuất xứ, tình trạng chiếc xe&#10;- Chính sách bảo hành, bảo trì, đổi trả xe&#10;- Địa chỉ giao nhận, đổi trả xe&#10;- Thời gian sử dụng xe"
                                    placeholderTextColor="#999"
                                    value={formData.description}
                                    onChangeText={(text) => updateFormData('description', text)}
                                    multiline
                                    maxLength={1500}
                                />
                                <Text style={styles.charCount}>{formData.description.length}/1500</Text>
                            </View>
                            <View style={styles.inputGroup}>
                                <View style={styles.priceHeader}>
                                    <Text style={styles.label}>
                                        Giá bán <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.aiButton}
                                        onPress={handleAIPriceSuggestion}
                                    >
                                        <Ionicons name="sparkles" size={16} color="#FF6B35" />
                                        <Text style={styles.aiButtonText}>AI gợi ý giá</Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập giá bán"
                                    placeholderTextColor="#999"
                                    value={formData.price}
                                    onChangeText={(text) => updateFormData('price', text)}
                                    keyboardType="numeric"
                                />
                            </View>
                            {/* Buttons */}
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
