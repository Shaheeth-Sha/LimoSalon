import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type AlertType = "success" | "error";

interface AlertModalProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ visible, type, title, message, onClose }: AlertModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View
            style={[
              styles.modalIconCircle,
              type === "success" ? styles.modalIconCircleSuccess : styles.modalIconCircleError,
            ]}
          >
            <Feather
              name={type === "success" ? "check" : "alert-circle"}
              size={28}
              color={type === "success" ? "#2ECC71" : "#FF2D75"}
            />
          </View>

          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconCircleSuccess: { backgroundColor: '#E8F8EF' },
  modalIconCircleError: { backgroundColor: '#FFE1EC' },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});