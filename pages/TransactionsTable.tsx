// TransactionsTable.tsx
// import eth from '../public/images/eth.svg";
// import Image from "next/image";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Network, Alchemy } from "alchemy-sdk";
const { Utils } = require("alchemy-sdk");
import styles from "../styles/Home.module.css";
import { get } from "http";

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

function getTimeDifference(targetTimestamp: number, blockTimestamp: number): string {
  const targetDate = new Date(targetTimestamp * 1000); // Convert to milliseconds
  const blockDate = new Date(blockTimestamp * 1000); // Convert to milliseconds

  const differenceInSeconds = Math.abs(blockDate.getTime() - targetDate.getTime()) / 1000;

  const hours = Math.floor(differenceInSeconds / 3600);
  const minutes = Math.floor((differenceInSeconds % 3600) / 60);
  const seconds = Math.floor(differenceInSeconds % 60);

  return `Difference: ${hours}h, ${minutes}m, ${seconds}s`;
}

function getDateString(timestamp: number) {
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
  const averageBlockTime = 12.16;
  let latestBlock = await alchemy.core.getBlock("latest");
  let blockNumber = latestBlock.number - Math.floor((latestBlock.timestamp - targetTimestamp) / averageBlockTime);

  // Get the block for the estimated block number
  let block = await alchemy.core.getBlock(blockNumber);

  // Estimate the block number again based on the difference
  const decreaseBlocks = Math.floor((block.timestamp - targetTimestamp) / averageBlockTime);
  blockNumber -= decreaseBlocks;

  // Get the block for the new estimated block number
  block = await alchemy.core.getBlock(blockNumber);

  // get gasPrice from the first transaction in this block
  const transactions = await alchemy.core.getBlockWithTransactions(block.hash);
  // ...
  if (
    transactions &&
    transactions.transactions &&
    transactions.transactions.length
  ) {
    const readableDate = new Date(targetTimestamp * 1000);
    console.log(`using timestamp ${targetTimestamp} (${readableDate.toISOString()})read Eth block (${blockNumber}). Tx[0].gasPrice=${transactions.transactions[0].gasPrice} Time difference: ${getTimeDifference(targetTimestamp, block.timestamp)}`);
  } else {
    console.log("No transactions found");
  }
  return transactions.transactions[0].gasPrice;
}

function TransactionsTable({ address }: { address: string }) {
  const [data, setData] = useState<TransactionData[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(true);
  const [ethPriceFetched, setEthPriceFetched] = useState<boolean>(false);
  const [transactionsCount, setTransactionsCount] = useState<number>(0);
  const [totalGasUsed, setTotalGasUsed] = useState<number>(0);
  const [totalTxZkCostUSD, setTotalTxZkCostUSD] = useState<number>(0);
  const [totalTxEthCostUSD, setTotalTxEthCostUSD] = useState<number>(0);
  const [saving, setSaving] = useState<number>(0);
  const [ethPriceToday, setEthPriceToday] = useState<number>(0);

  useEffect(() => {
    getTransactionData(address).then((data) => {
      setData(data);
      setIsLoadingTxs(false);
      setTransactionsCount(data.length);
    });
    console.log("data", data);
  }, [address]);

  useEffect(() => {
    if (!isLoadingTxs && !ethPriceFetched) {
      getEthPrice(data);
      setEthPriceFetched(true);
    }
  }, [isLoadingTxs, data]);

  async function getTransactionData(address: string) {
    let totalCost: number = 0;
    let totalZkCost: number = 0;
    let totalEthCost: number = 0;
    let saving: number = 0;
    let totalGasUsed: number = 0;
    const transactions = await getTransactions(address);
    const parsedTransactions: TransactionData[] = [];

    // get eth price today
    const [date, ] = getDateString((Date.now() / 1000));

    const ethPriceToday = await getHistoricalPrice(date as string);
    console.log(`today ${date} eth price is ${ethPriceToday}`);
    setEthPriceToday(ethPriceToday);

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
        // try {
        //   price_usd = await new Promise<number>((resolve) =>
        //     setTimeout(() => resolve(getHistoricalPrice(date)), 2000)
        //   );
        // } catch (error) {
        //   price_usd = 2000;
        //   console.error("An error occurred:", error);
        // }
        const gasUsed = transaction.gasUsed;
        const gasPrice = transaction.gasPrice;
        const txZkCostUSD = (gasUsed * gasPrice * ethPriceToday) / 1e18;
        totalZkCost += txZkCostUSD;
        saving -= txZkCostUSD;
        totalGasUsed += Number(gasUsed);
        const shortHash =
          transaction.hash.slice(0, 6) + "..." + transaction.hash.slice(-4);
        const parsedTx: TransactionData = {
          hash: transaction.hash,
          shortHash,
          date: String(date),
          unixTimestamp: Number(unixTimestamp),
          gasUsed,
          zkGasPrice: (gasPrice / 1000000000).toFixed(4).toString(),
          txZkCostUSD: txZkCostUSD.toFixed(4).toString(),
          ethGasPrice: "0",
          txEthCostUSD: 0,
          diffUSD: -txZkCostUSD,
          totalCost,
        };
        // updateData(toPrint);
        parsedTransactions.push(parsedTx);
      }
    );

    setTotalGasUsed(totalGasUsed);
    setSaving(saving);
    setTotalTxZkCostUSD(totalZkCost);
    setIsLoadingTxs(false);
    return parsedTransactions;
  }

  async function getEthPrice(transactions: TransactionData[]) {
    let updatedTransactions: TransactionData[] = [...data];
    let totalTxEthCostUSD: number = 0;
    let saving: number = 0;

    for (let i = 0; i < transactions.length; i++) {
      const ethGasPrice = await getGasPriceOnEth(transactions[i].unixTimestamp);
      const ethGasPriceEth = Utils.formatEther(ethGasPrice);
      const txEthCostUSD =
        Number(transactions[i].gasUsed) * ethPriceToday * ethGasPriceEth;
      totalTxEthCostUSD += txEthCostUSD;
      saving += txEthCostUSD;
      const diffUSD = txEthCostUSD - Number(transactions[i].txZkCostUSD);
      updatedTransactions[i] = {
        ...transactions[i],
        ethGasPrice: (Number(ethGasPrice) / 1000000000).toFixed(4).toString(),
        txEthCostUSD,
        diffUSD,
      };

      setSaving(saving);
      setTotalTxEthCostUSD(totalTxEthCostUSD);
      setTotalTxEthCostUSD(totalTxEthCostUSD);
      setData([...updatedTransactions]);
    }
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.box}>
          <h3>Transactions Count</h3>
          <p>{transactionsCount}</p>
        </div>
        <div className={styles.box}>
          <h3>Total Gas Used</h3>
          <p>{totalGasUsed}</p>
        </div>
        <div className={styles.box}>
          <h3>Cost on Astar zkEVM</h3>
          <p>${totalTxZkCostUSD.toFixed(3)}</p>
        </div>
        <div className={styles.box}>
          <h3>Cost on Ethereum</h3>
          <p>${totalTxEthCostUSD.toFixed(2)}</p>
        </div>
        <div className={styles.box}>
          <h3>Savings</h3>
          <p>${(totalTxEthCostUSD - totalTxZkCostUSD).toFixed(2)}</p>
        </div>
      </div>
      <div className={styles.box}>
        <h2 className={styles['text-center']}>{address}</h2>
        <p className={styles['large-text']}>
          Hey there! You&apos;ve made {transactionsCount} transactions with this address and used up {totalGasUsed} gas.
        </p>
        <p className={styles['large-text']}>
          That cost you ${totalTxZkCostUSD.toFixed(3)} on Astar zkEVM.
        </p>
        <p className={styles['large-text']}>
          If you had done the same transactions on the Ethereum mainnet, it would have cost you ${totalTxEthCostUSD.toFixed(2)}.
        </p>
        <p className={styles['large-text']}>
          Good news is, by using  Astar zkEVM, you&apos;ve saved a cool ${(totalTxEthCostUSD - totalTxZkCostUSD).toFixed(2)}!
        </p>
        <p className={styles.grayText}>
          The calculation is based on today&apos;s price of Ethereum ${ethPriceToday.toFixed(0)}.
        </p>
      </div>
      <table className={styles.table}>
        <thead>
          <tr className={styles['header-row']}>
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
