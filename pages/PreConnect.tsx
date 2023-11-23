import { ConnectWallet } from '@thirdweb-dev/react';
import styles from "../styles/Home.module.css";

export default function PreConnect() {
    return (
      <div className={styles.preConnect}>
        <img src="/images/whirligig.png" alt="Zvrk" className={styles.image} />
        <div>
          <p className={styles.text}>Just connect your wallet and let's see how much you've spent on zkAstar, and compare it with what it would have cost on the Ethereum mainnet.</p>
          <ConnectWallet
            dropdownPosition={{
              side: "top",
              align: "end",
            }}
          />
        </div>
      </div>
    );
  }
  
