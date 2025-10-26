# Sample Smart Contracts for Testing

## 1. Vulnerable Token Contract (High Risk)

```solidity
pragma solidity ^0.8.0;

contract VulnerableToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    address public owner;
    
    constructor() {
        owner = msg.sender;
        totalSupply = 1000000;
        balances[owner] = totalSupply;
    }
    
    // Vulnerable to integer overflow
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        balances[to] += amount; // No overflow check
    }
    
    // Missing access control
    function mint(address to, uint256 amount) public {
        totalSupply += amount;
        balances[to] += amount;
    }
    
    // Vulnerable to reentrancy
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success);
        balances[msg.sender] = 0; // State change after external call
    }
}
```

## 2. Simple Storage Contract (Low Risk)

```solidity
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private data;
    address public owner;
    
    event DataUpdated(uint256 newValue);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    function setData(uint256 _data) public onlyOwner {
        data = _data;
        emit DataUpdated(_data);
    }
    
    function getData() public view returns (uint256) {
        return data;
    }
}
```

## 3. Vulnerable Lottery Contract (Critical Risk)

```solidity
pragma solidity ^0.8.0;

contract VulnerableLottery {
    address public manager;
    address[] public players;
    
    constructor() {
        manager = msg.sender;
    }
    
    function enter() public payable {
        require(msg.value > 0.01 ether);
        players.push(msg.sender);
    }
    
    // Vulnerable to timestamp manipulation
    function pickWinner() public {
        require(msg.sender == manager);
        require(players.length > 0);
        
        // Bad randomness source
        uint index = uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % players.length;
        address winner = players[index];
        
        // No checks-effects-interactions pattern
        payable(winner).transfer(address(this).balance);
        
        players = new address[](0);
    }
    
    // No withdrawal pattern
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
```

## Usage Instructions

1. Copy any of these contracts
2. Paste into the audit textarea
3. Click "Audit Smart Contract"
4. Review the vulnerability report
5. Download the PDF report using the "Download PDF Report" button

Each contract demonstrates different security issues that the audit tool should detect.
