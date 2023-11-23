// TransactionsTable.tsx
// import eth from '../public/images/eth.svg';
// import Image from "next/image";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Network, Alchemy } from "alchemy-sdk";
const { Utils } = require("alchemy-sdk");
import styles from "../styles/Home.module.css";

interface TransactionData {
  hash: string;
  shortHash: string;
  date: string;
  unixTimestamp: number;
  gasUsed: string;
  zkGasPrice: string;
  txZkCostUSD: string;
  ethGasPrice: string | undefined;
  txEthCostUSD: number;
  diffUSD: number;
  totalCost: number;
}

const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
console.log("etherscan key set", !!ETHERSCAN_API_KEY);
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
console.log("alchemy key set", !!ALCHEMY_API_KEY);

const alchemySettings = {
  apiKey: ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(alchemySettings);

async function getTransactions(address: string) {
  // `https://zkatana.blockscout.com/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from`
  const response = await axios.get(
    `https://zkatana.blockscout.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=966666&page=1&offset=60&sort=asc`
  );
  // console.log("response", response.data.result);
  return response.data.result;
}

async function getHistoricalPrice(date: string) {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${date}`
  );
  return response.data.market_data.current_price.usd;
}

async function getGecko() {
  let data;
  const api_url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum&vs_currencies=usd";
  async function getData() {
    const response = await fetch(api_url);
    data = await response.json();
    console.log("getGecko ethereum price", data.ethereum.usd);
  }
  getData();
}


function getDateString(timestamp: number) {
  // const timestamp: number = parseInt(transaction.timeStamp.toString());
  const dateObject = new Date(timestamp * 1000);
  const day = String(dateObject.getDate()).padStart(2, "0");
  const month = String(dateObject.getMonth() + 1).padStart(2, "0"); // January is 0!
  const year = dateObject.getFullYear();
  const date = `${day}-${month}-${year}`;
  const unixTimestamp: number = Math.floor(dateObject.getTime() / 1000);
  console.log("transaction.timestamp, unixTimestamp", date, unixTimestamp);

  return [date, unixTimestamp];
}

async function getGasPriceOnEth(targetTimestamp: number) {
  const averageBlockTime = 15.1;
  let block = await alchemy.core.getBlock("latest");
  let blockNumber = block.number;
  let blockTime = block.timestamp;
  const decreaseBlocks = Math.floor(
    (blockTime - targetTimestamp) / averageBlockTime
  );
  blockNumber -= decreaseBlocks;

  // find blockhash to get first Tx.
  block = await alchemy.core.getBlock(blockNumber);

  // get gasPrice from the first transaction in this block
  const transactions = await alchemy.core.getBlockWithTransactions(block.hash);
  if (
    transactions &&
    transactions.transactions &&
    transactions.transactions.length
  ) {
    console.log(
      `Ethereum gasPrice for block ${blockNumber} and first Tx is ${transactions.transactions[0].gasPrice}`
    );
  } else {
    console.log("No transactions found");
  }
  return transactions.transactions[0].gasPrice;
}

function TransactionsTable({ address }: { address: string }) {
  const [data, setData] = useState<TransactionData[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(true);

  useEffect(() => {
    getTransactionData(address).then((data) => setData(data));
    console.log("data", data);
    setIsLoadingTxs(false);
  }, [address, isLoadingTxs]);

  useEffect(() => {
    getEthPrice(data);
  }, [isLoadingTxs]);

  async function getTransactionData(address: string) {
    const transactions = await getTransactions(address);
    let totalCost: number = 0;
    const parsedTransactions: TransactionData[] = [];
    // iterate over transactions on zk Node
    transactions.forEach(
      async (transaction: {
        timeStamp: string | number | Date;
        gasUsed: any;
        gasPrice: any;
        hash: string;
      }) => {
        const [date, unixTimestamp] = getDateString(
          transaction.timeStamp as number
        );
        let price_usd = 2000;
        // try {
        //   price_usd = await new Promise<number>((resolve) =>
        //     setTimeout(() => resolve(getHistoricalPrice(date)), 2000)
        //   );
        // } catch (error) {
        //   price_usd = 2000;
        //   console.error('An error occurred:', error);
        // }
        const ethGasPrice = 0;
        const gasUsed = transaction.gasUsed;
        const gasPrice = transaction.gasPrice;
        const txZkCostUSD = (gasUsed * gasPrice * price_usd) / 1e18;
        const ethGasPriceEth = Utils.formatEther(ethGasPrice);
        const txEthCostUSD = gasUsed * price_usd * ethGasPriceEth;
        const shortHash =
          transaction.hash.slice(0, 6) + "..." + transaction.hash.slice(-4);
        console.log(
          `Transaction ${shortHash} on ${date} zkCost ${txZkCostUSD} USD, ethCost ${txEthCostUSD} USD`
        );
        const parsedTx: TransactionData = {
          hash: transaction.hash,
          shortHash,
          date: String(date),
          unixTimestamp: Number(unixTimestamp),
          gasUsed,
          zkGasPrice: (gasPrice / 1000000000).toFixed(4).toString(),
          txZkCostUSD: txZkCostUSD.toFixed(4).toString(),
          ethGasPrice: (ethGasPriceEth * 1000000000).toFixed(4).toString(),
          txEthCostUSD,
          diffUSD: txEthCostUSD - txZkCostUSD,
          totalCost,
        };
        // updateData(toPrint);
        parsedTransactions.push(parsedTx);
      }
    );
    setIsLoadingTxs(false);
    return parsedTransactions;
  }

  async function getEthPrice(transactions: TransactionData[]) {
    const updatedTransactions: TransactionData[] = [];

    for (const transaction of transactions) {
      const ethGasPrice = await getGasPriceOnEth(transaction.unixTimestamp);
      const updatedTransaction: TransactionData = {
        ...transaction,
        ethGasPrice: (Number(ethGasPrice) / 1000000000).toFixed(4).toString(),
      };
      updatedTransactions.push(updatedTransaction);
    }

    setData(updatedTransactions);
  }

  return (
    <>
      <h1>{address}</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Transaction Hash</th>
            <th>Date</th>
            <th>Gas Used</th>
            <th>zk Gas Price (GWEI)</th>
            <th>Value in USD</th>
            <th className={styles.ethbg}>
              {/* <img src={eth} alt="Ethereum" style={{ height: '20px' }} /> */}
              Eth Gas Price (GWEI)
            </th>
            <th className={styles.ethbg}>
              {/* <img src={eth} alt="Ethereum" style={{ height: '20px' }} /> */}
              Eth Value in USD
            </th>
            <th>Saving (USD)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((transaction, index) => (
            <tr key={index}>
              <td>{index + 1}</td>

              <td>
                <a
                  href={`https://zkatana.blockscout.com//tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {transaction.shortHash}
                </a>
              </td>

              <td>
                <span style={{ whiteSpace: "nowrap" }}>{transaction.date}</span>
              </td>
              <td>{transaction.gasUsed}</td>
              <td>{transaction.zkGasPrice}</td>
              <td>{transaction.txZkCostUSD}</td>
              <td className={styles.ethbg}>{transaction.ethGasPrice}</td>
              <td className={styles.ethbg}>
                {transaction.txEthCostUSD.toFixed(4)}
              </td>
              <td>{transaction.diffUSD.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default TransactionsTable;
