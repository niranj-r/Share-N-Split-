import { motion } from 'framer-motion';

export default function LoadingSpinner() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            flexDirection: 'column',
            gap: 32,
            background: 'var(--bg)', /* Inherit the theme background */
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999
        }}>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ position: 'relative' }}
            >
                {/* Background ambient glow */}
                <motion.div
                    style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: '120%', height: '120%',
                        background: 'radial-gradient(circle, rgba(255, 51, 0, 0.4) 0%, transparent 70%)',
                        translate: '-50% -50%',
                        zIndex: 0,
                        filter: 'blur(20px)'
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* The Logo Layer */}
                <motion.img
                    src="/kryselogo.png"
                    alt="KRYSE Logo"
                    width={100}
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        filter: 'drop-shadow(0 0 10px rgba(255,51,0,0.5))'
                    }}
                    animate={{
                        y: [0, -8, 0],
                        filter: ['drop-shadow(0 0 10px rgba(255,51,0,0.5))', 'drop-shadow(0 0 25px rgba(255,51,0,0.9))', 'drop-shadow(0 0 10px rgba(255,51,0,0.5))']
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.div>

            <motion.div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                }}
            >
                <div style={{
                    fontSize: '1.2rem',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    letterSpacing: '0.2em'
                }}>
                    KRYSE
                </div>
                <motion.div
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent)',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 500
                    }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    Initializing...
                </motion.div>
            </motion.div>
        </div>
    );
}
