"use client";

import { Container, Header, MessageList, Composer, useWebchat, Fab } from '@botpress/webchat'
import { useState, useMemo } from 'react'

const headerConfig = {
    botName: 'Support Bot',
    soundEnabled: true,
    botAvatar: 'https://www.kadimemillaat.org/android-chrome-92x92.png',
    botDescription: 'Virtual assistant',

    phone: {
        title: 'Call Support',
        link: 'tel:+918081747259',
    },

    email: {
        title: 'Email Us',
        link: 'mailto:support@khadimemillat.org',
    },

    // website: {
    //     title: 'Visit our website',
    //     link: 'https://khadimemillat.org',
    // },

    // termsOfService: {
    //     title: 'Terms of Service',
    //     link: 'https://khadimemillat.org/terms',
    // },

    // privacyPolicy: {
    //     title: 'Privacy Policy',
    //     link: 'https://khadimemillat.org/privacy',
    // },
}

function ChatBot() {
    const [isWebchatOpen, setIsWebchatOpen] = useState(true)
    const { client, messages, isTyping, user, clientState, newConversation } = useWebchat({
        clientId: '72d9b166-84ac-45fb-aa6a-b3e33770207e'
    })

    const config = {
        botName: 'Suppor tBot',
        botAvatar: 'https://www.khadimemillat.org/android-chrome-512x512.png',
        botDescription: 'Your virtual assistant for all things support.',
    }

    const enrichedMessages = useMemo(
        () =>
            messages.map((message) => {
                const { authorId } = message
                const direction: 'outgoing' | 'incoming' = authorId === user?.userId ? 'outgoing' : 'incoming'
                return {
                    ...message,
                    direction,
                    sender:
                        direction === 'outgoing'
                            ? { name: 'You', avatar: undefined }
                            : { name: config.botName ?? 'Bot', avatar: config.botAvatar },
                }
            }),
        [config.botAvatar, config.botName, messages, user?.userId]
    )

    const toggleWebchat = () => {
        setIsWebchatOpen((prevState) => !prevState)
    }

    return (
        <>
            <Container
                connected={clientState.toString() !== 'disconnected'}
                style={{
                    zIndex: 1000,
                    width: '300px',
                    height: '500px',
                    display: isWebchatOpen ? 'flex' : 'none',
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                }}
            >
                <Header
                    // onOpenChange={() => console.log('Override the header open change')}
                    defaultOpen={false}
                    closeWindow={() => setIsWebchatOpen(false)}
                    restartConversation={newConversation}
                    disabled={false}
                    configuration={headerConfig}
                    // botAvatar={config.botAvatar}
                />
                <MessageList
                    botAvatar={config.botAvatar}
                    botName={config.botName}
                    botDescription={config.botDescription}
                    isTyping={isTyping}
                    headerMessage="Chat History"
                    showMarquee={true}
                    messages={enrichedMessages}
                    sendMessage={client?.sendMessage}
                />
                <Composer
                    disableComposer={false}
                    isReadOnly={false}
                    allowFileUpload={false}
                    connected={clientState.toString() !== 'disconnected'}
                    sendMessage={client?.sendMessage}
                    uploadFile={client?.uploadFile}
                    composerPlaceholder="Type a message..."
                />
            </Container>
            <Fab onClick={() => toggleWebchat()} style={{ zIndex: 1000, position: 'fixed', bottom: '30px', right: '90px', width: '52px', height: '52px' }} />
        </>
    )
}

export default ChatBot