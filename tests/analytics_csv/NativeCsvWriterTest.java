package com.zenstudy.focus;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
public class NativeCsvWriterTest {
    static int cases;
    static class Doc implements NativeCsvWriter.Document {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        boolean closed, closeFails, writeFails, flushFails, readCloseFails, nullOutput, nullInput;
        byte[] override;
        public OutputStream openOutput() {
            if (nullOutput) return null;
            return new OutputStream() {
                public void write(int b) throws IOException { if(writeFails) throw new IOException(); bytes.write(b); }
                public void flush() throws IOException { if(flushFails) throw new IOException(); }
                public void close() throws IOException {closed=true;if(closeFails) throw new IOException();}
            };
        }
        public InputStream openInput() throws IOException {
            if(!closed) throw new AssertionError("Must close output before readback");
            if(nullInput)return null;
            return new ByteArrayInputStream(override==null?bytes.toByteArray():override) {
                public void close() throws IOException {if(readCloseFails)throw new IOException();}
            };
        }
    }
    static void check(Doc d,String csv,boolean success) throws Exception {
        boolean passed;
        try{NativeCsvWriter.writeAndVerify(d,csv);passed=true;}catch(IOException expected){passed=false;}
        if(passed!=success)throw new AssertionError("Unexpected result case "+cases);
        cases++;
    }
    public static void main(String[] args) throws Exception {
        String csv="\"id\",\"title\"\r\n\"1\",\"مرحبا, \"\"中文\"\"\"\r\n";
        Doc d=new Doc();check(d,csv,true);
        if(!Arrays.equals(d.bytes.toByteArray(),csv.getBytes(StandardCharsets.UTF_8)))throw new AssertionError();
        d=new Doc();d.closeFails=true;check(d,csv,false);
        d=new Doc();d.writeFails=true;check(d,csv,false);
        d=new Doc();d.flushFails=true;check(d,csv,false);
        d=new Doc();d.readCloseFails=true;check(d,csv,false);
        d=new Doc();d.nullOutput=true;check(d,csv,false);
        d=new Doc();d.nullInput=true;check(d,csv,false);
        d=new Doc();d.override=new byte[0];check(d,csv,false);
        d=new Doc();d.override=(csv+"extra").getBytes(StandardCharsets.UTF_8);check(d,csv,false);
        d=new Doc();d.override=csv.replace('1','2').getBytes(StandardCharsets.UTF_8);check(d,csv,false);
        d=new Doc();check(d,"x".repeat(NativeCsvWriter.MAX_BYTES+1),false);
        if(d.bytes.size()!=0)throw new AssertionError("Oversize must not open/write target");
        System.out.println("PASS NativeCsvWriter "+cases+" actual Java fault cases");
    }
}
