import * as Contacts from "expo-contacts";

/**
 * Busca o nome de um contato na agenda pelo número de telefone.
 * Se não encontrar, retorna o próprio número formatado.
 */
export async function getContactNameByPhone(phoneNumber) {
  if (!phoneNumber) return "Desconhecido";
  
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      return phoneNumber;
    }

    // Limpar o número para busca (remover +, espaços, parênteses, hífens)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Se o número for muito curto, retorna ele mesmo
    if (cleanPhone.length < 8) return phoneNumber;

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    if (data && data.length > 0) {
      for (const contact of data) {
        if (contact.phoneNumbers) {
          for (const phone of contact.phoneNumbers) {
            const contactCleanPhone = phone.number.replace(/\D/g, '');
            
            // Comparação flexível (últimos 8 ou 9 dígitos para lidar com DDI/DDD)
            if (contactCleanPhone.endsWith(cleanPhone.slice(-8)) || 
                cleanPhone.endsWith(contactCleanPhone.slice(-8))) {
              return contact.name;
            }
          }
        }
      }
    }
    
    return phoneNumber;
  } catch (error) {
    console.error("Erro ao buscar contato:", error);
    return phoneNumber;
  }
}
