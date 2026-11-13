/* Sample engineering notes used by the "Try sample notes" button. */
window.SAMPLE_NOTES = `Unit 2: CPU Scheduling

CPU scheduling is the process of deciding which process in the ready queue gets the CPU next. It is a key function of the operating system because it improves CPU utilisation and system throughput. The part of the OS that makes this decision is called the CPU scheduler.

Scheduling Criteria:
- CPU utilisation: keep the CPU as busy as possible.
- Throughput: number of processes completed per unit time.
- Turnaround time is the total time taken from submission of a process to its completion.
- Waiting time is the total time a process spends waiting in the ready queue.
- Response time is the time from submission until the first response is produced.

Formulas
Turnaround Time = Completion Time - Arrival Time
Waiting Time = Turnaround Time - Burst Time

Types of Scheduling
Preemptive scheduling allows the OS to take the CPU away from a running process. Non-preemptive scheduling means a process keeps the CPU until it finishes or blocks. Preemptive scheduling gives better response time but has higher context switching overhead.

First Come First Serve (FCFS)
FCFS is the simplest scheduling algorithm where the process that arrives first is executed first. It is non-preemptive and easy to implement using a FIFO queue. The main disadvantage of FCFS is the convoy effect, where short processes wait behind a long process.

Shortest Job First (SJF)
SJF is an algorithm that selects the process with the smallest burst time. It gives the minimum average waiting time for a given set of processes. However, it is difficult to know the burst time in advance and it can cause starvation of long processes.

Round Robin (RR)
Round Robin is a preemptive algorithm designed for time-sharing systems. Each process gets a small unit of CPU time called a time quantum. If the time quantum is too large, RR behaves like FCFS; if it is too small, context switching overhead increases.

Steps of Round Robin scheduling:
1. Place all ready processes in a circular queue.
2. Pick the first process and give it the CPU for one time quantum.
3. If the process finishes, remove it from the queue.
4. Otherwise, preempt it and move it to the end of the queue.
5. Repeat until all processes are completed.

Advantages of Round Robin
- Every process gets a fair share of the CPU.
- No starvation, because each process gets a turn.
- Good response time for interactive systems.`;
