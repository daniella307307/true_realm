import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, ToastConfigParams } from 'react-native-toast-message';

const toastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#15D8BA',
        borderRightColor: '#15D8BA',
        backgroundColor: '#ffffff',
        borderRadius: 60,
        shadowColor: '#0000008e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '500',
        color: '#15D8BA'
      }}
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#ffe6e6',
        borderRightColor: '#ffe6e6',
        backgroundColor: '#fff',
        borderRadius: 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }}
      text1Style={{
        fontSize: 17,
        fontWeight: '500',
        color: '#FF0000'
      }}
      text2Style={{
        fontSize: 15,
      }}
    />
  ),
  customToast: ({ text1, props }: ToastConfigParams<any>) => (
    <View
      style={{
        height: 60,
        width: '90%',
        backgroundColor: 'tomato',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16 }}>{text1}</Text>
      <Text style={{ color: '#fff', fontSize: 13 }}>{props?.uuid}</Text>
    </View>
  ),
};

export default toastConfig;